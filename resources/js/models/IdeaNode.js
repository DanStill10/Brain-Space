export const colorMap = {
    'blue': ['#3b82f6', '#1d4ed8'],
    'emerald': ['#10b981', '#047857'],
    'violet': ['#8b5cf6', '#6d28d9'],
    'amber': ['#f59e0b', '#b45309'],
    'rose': ['#f43f5e', '#be123c']
};
export const colorKeys = Object.keys(colorMap);

export function wrapText(context, text, maxWidth, maxLines) {
    context.font = '500 14px system-ui';
    const words = text.split(' ');
    let lines = [];
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
        const testLine = currentLine + words[i] + ' ';
        const metrics = context.measureText(testLine);
        if (metrics.width > maxWidth && i > 0) {
            lines.push(currentLine.trim());
            currentLine = words[i] + ' ';
        } else {
            currentLine = testLine;
        }
    }
    lines.push(currentLine.trim());

    if (lines.length > maxLines) {
        lines = lines.slice(0, maxLines);
        let lastLine = lines[lines.length - 1];
        while(context.measureText(lastLine + '...').width > maxWidth && lastLine.length > 0) {
            lastLine = lastLine.slice(0, -1);
        }
        lines[lines.length - 1] = lastLine.trim() + '...';
    }
    return lines;
}

/**
 * Class IdeaNode
 * 
 * Think of this class as the "atomic unit" of our Brain Space graph. It's much 
 * more than just a data container for an idea; it's a living, breathing object
 * that manages its own state, physics, rendering logic, and lifecycle.
 * 
 * Why approach it this way? By encapsulating these concerns (movement, collision, 
 * decay, drawing) inside the `IdeaNode`, we make our main animation loop much 
 * cleaner and more scalable. Instead of having a massive, monolithic script 
 * managing everything, each `IdeaNode` takes responsibility for its own behavior.
 * 
 * This is the essence of Object-Oriented Programming (OOP) in a frontend context: 
 * bundle data and behavior together to build complex, interactive systems from 
 * manageable, reusable components.
 */
export class IdeaNode {
    constructor(dbId, text, x, y, colorTheme, priority, ctx, lastInteractedAt) {
        this.id = dbId; 
        this.text = text;
        this.x = x;
        this.y = y;
        this.priority = priority || 0;
        this.lastInteractedAt = lastInteractedAt ? new Date(lastInteractedAt) : new Date();
        
        // --- SCALE & LUMINOSITY ---
        // Reduced base radius (35px - 70px range)
        this.baseRadius = Math.max(35, Math.min(65, text.length * 1.8)) + (this.priority * 2.5);
        this.radius = 0; 
        this.targetRadius = this.baseRadius;

        // --- PHYSICS & INERTIA ---
        const inertiaFactor = 1 - (this.priority / 10); 
        this.vx = (Math.random() - 0.5) * (2.5 * inertiaFactor); // Boosted base speed
        this.vy = (Math.random() - 0.5) * (2.5 * inertiaFactor);
        
        // Individualized Sector Logic
        // Some ideas like being close, others like drifting far
        this.personalSectorRadius = 300 + (Math.random() * 500); 
        this.gravitationalSensitivity = 0.0001 + (Math.random() * 0.0004);
        
        // Colors
        const selectedTheme = colorTheme && colorMap[colorTheme] ? colorTheme : colorKeys[Math.floor(Math.random() * colorKeys.length)];
        this.colorTheme = selectedTheme;
        const colorSet = colorMap[selectedTheme];
        this.colorStart = colorSet[0];
        this.colorEnd = colorSet[1];
        
        const maxTextWidth = this.baseRadius * 1.6; 
        this.lines = wrapText(ctx, this.text, maxTextWidth, 3); 

        // State
        this.isDragging = false;
        this.children = [];
        this.isDecayed = false;
        this.mass = this.baseRadius; 
        this.vortexAngle = Math.random() * Math.PI * 2; 

        // Glitch state for unstable ideas
        this.glitchTimer = 0;
    }

    absorb(childNode) {
        let cStart = childNode.colorStart;
        let cEnd = childNode.colorEnd;

        if (!cStart || !cEnd) {
            const theme = childNode.color && colorMap[childNode.color] ? childNode.color : 'blue';
            cStart = colorMap[theme][0];
            cEnd = colorMap[theme][1];
        }

        this.children.push({
            id: childNode.id,
            text: childNode.text,
            colorStart: cStart,
            colorEnd: cEnd,
            radius: 12, // Scaled down children
            offsetX: (Math.random() - 0.5) * 15,
            offsetY: (Math.random() - 0.5) * 15,
            dx: (Math.random() - 0.5) * 1.2,
            dy: (Math.random() - 0.5) * 1.2
        });

        this.targetRadius = this.baseRadius + (this.children.length * 8);
        this.mass = this.baseRadius + (this.children.length * 12);
    }

    update(ideasArray, width, height) {
        const msPerDay = 86400000;
        const age = new Date() - this.lastInteractedAt;
        
        // Priority affects stability (decay speed)
        // High priority lasts longer
        const decayMultiplier = 1 + (this.priority * 0.5);
        this.isWaning = age > msPerDay * decayMultiplier && age <= msPerDay * 3 * decayMultiplier;
        this.isDecayed = age > msPerDay * 3 * decayMultiplier;

        const activeMass = this.baseRadius + (this.children.length * 12);
        this.mass = this.isDecayed ? 0.1 : activeMass;

        this.radius += (this.targetRadius - this.radius) * 0.1;

        if (this.children.length > 0) {
            this.vortexAngle += 0.008 + (this.children.length * 0.003);
        }

        if (!this.isDragging) {
            let multiplier = this.isDecayed ? 0.15 : (this.isWaning ? 0.4 : 1.0);
            
            // --- INDIVIDUALIZED SOFT SECTOR ---
            const distToCenter = Math.hypot(this.x, this.y);
            if (distToCenter > this.personalSectorRadius) {
                const pullStrength = this.gravitationalSensitivity * (distToCenter - this.personalSectorRadius);
                this.vx -= (this.x / distToCenter) * pullStrength;
                this.vy -= (this.y / distToCenter) * pullStrength;
            }

            this.x += this.vx * multiplier;
            this.y += this.vy * multiplier;

            let currentDamping = 0.995; // Slightly less damping to preserve momentum

            for (let other of ideasArray) {
                if (other === this) continue;

                let dx = other.x - this.x;
                let dy = other.y - this.y;
                let distance = Math.sqrt(dx * dx + dy * dy);
                if (distance === 0) { 
                    dx = Math.random() - 0.5;
                    dy = Math.random() - 0.5;
                    distance = Math.sqrt(dx * dx + dy * dy);
                }
                const minDistance = (this.radius + other.radius) * 1.5; // Increased repulsion zone

                if (distance < minDistance) {
                    const angle = Math.atan2(dy, dx);
                    const overlap = minDistance - distance;
                    const totalMass = this.mass + other.mass;
                    const r1 = other.mass / totalMass;
                    const r2 = this.mass / totalMass;

                    this.x -= overlap * Math.cos(angle) * r1;
                    this.y -= overlap * Math.sin(angle) * r1;
                    other.x += overlap * Math.cos(angle) * r2;
                    other.y += overlap * Math.sin(angle) * r2;
                    
                    const vRelX = this.vx - other.vx;
                    const vRelY = this.vy - other.vy;
                    const nx = dx / distance;
                    const ny = dy / distance;
                    const dot = vRelX * nx + vRelY * ny;
                    if (dot < 0) {
                        const restitution = 0.8; // More bounciness
                        const impulse = ((1 + restitution) * dot) / (this.mass + other.mass);
                        this.vx -= impulse * other.mass * nx * 1.5;
                        this.vy -= impulse * other.mass * ny * 1.5;
                        other.vx += impulse * this.mass * nx * 1.5;
                        other.vy += impulse * this.mass * ny * 1.5;
                    }
                }
            }

            this.vx *= currentDamping;
            this.vy *= currentDamping;
            
            // Random jitter for "life"
            if (Math.random() > 0.99) {
                this.vx += (Math.random() - 0.5) * 0.5;
                this.vy += (Math.random() - 0.5) * 0.5;
            }
        }

        if (this.children.length > 0) {
            this.children.forEach(child => {
                child.offsetX += child.dx;
                child.offsetY += child.dy;
                const distFromCenter = Math.sqrt(child.offsetX * child.offsetX + child.offsetY * child.offsetY);
                if (distFromCenter > this.radius - child.radius - 4) {
                    child.dx *= -1;
                    child.dy *= -1;
                }
            });
        }

        if (this.isDecayed || this.isWaning) {
            this.glitchTimer += 0.05;
        }
    }

    draw(ctx, currentZoom = 1, isFocused = false, camOffsetX = 0, camOffsetY = 0) {
        if (this.radius < 1) return;

        // --- GLITCH EFFECT ---
        let drawX = this.x;
        let drawY = this.y;
        if ((this.isDecayed || this.isWaning) && Math.random() > 0.95) {
            drawX += (Math.random() - 0.5) * 4;
            drawY += (Math.random() - 0.5) * 4;
        }

        const isZooming = currentZoom > 1.001;

        // --- DRAW RETICLE (LOCK-ON) ---
        if (isFocused) {
            ctx.save();
            ctx.translate(drawX, drawY);
            
            const reticleSize = this.radius + 15;
            const bracketLen = 12;
            const glowColor = this.colorStart;

            ctx.strokeStyle = glowColor;
            ctx.lineWidth = 2;
            ctx.shadowBlur = 15;
            ctx.shadowColor = glowColor;

            const pulse = Math.sin(Date.now() * 0.01) * 3;
            const s = reticleSize + pulse;

            for (let i = 0; i < 4; i++) {
                ctx.rotate(Math.PI / 2);
                ctx.beginPath();
                ctx.moveTo(s - bracketLen, s);
                ctx.lineTo(s, s);
                ctx.lineTo(s, s - bracketLen);
                ctx.stroke();
            }

            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.moveTo(-5, 0); ctx.lineTo(5, 0);
            ctx.moveTo(0, -5); ctx.lineTo(0, 5);
            ctx.stroke();

            ctx.restore();
        }

        // --- DRAW SPACE-AGE VORTEX ---
        if (this.children.length > 0 && !this.isDecayed && currentZoom < 1.2) {
            ctx.save();
            ctx.translate(drawX, drawY);
            
            const gravityRadius = this.radius * 4;
            const bloomAlpha = (0.02 + (this.children.length * 0.005)) * (isZooming ? 0.3 : 1);
            const grad = ctx.createRadialGradient(0, 0, this.radius, 0, 0, gravityRadius);
            grad.addColorStop(0, `${this.colorStart}${Math.floor(bloomAlpha * 255).toString(16).padStart(2, '0')}`);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, gravityRadius, 0, Math.PI * 2);
            ctx.fill();

            const numRings = Math.min(3, Math.ceil(this.children.length / 2));
            for (let i = 1; i <= numRings; i++) {
                const ringRadius = this.radius + (i * 25) + (Math.sin(Date.now() * 0.001) * 2);
                const rotationSpeed = this.vortexAngle * (i % 2 === 0 ? -1 : 1.2) * (0.8 / i);
                
                ctx.save();
                ctx.rotate(rotationSpeed);
                for (let f = 0; f < 3; f++) {
                    ctx.rotate((Math.PI * 2) / 3);
                    ctx.beginPath();
                    const arcLen = (Math.PI / 4) + (this.children.length * 0.08);
                    ctx.arc(0, 0, ringRadius, 0, arcLen);
                    ctx.strokeStyle = this.colorStart;
                    ctx.lineWidth = 1;
                    ctx.lineCap = 'round';
                    ctx.globalAlpha = (0.1 + (this.children.length * 0.02)) / i;
                    ctx.stroke();
                }
                ctx.restore();
            }
            ctx.restore();
        }

        let drawColorStart = this.colorStart;
        let drawColorEnd = this.colorEnd;
        let alpha = 1.0;

        if (this.isDecayed) {
            drawColorStart = '#94a3b8'; 
            drawColorEnd = '#475569';
            alpha = 0.3;
        } else if (this.isWaning) {
            alpha = 0.65;
        }

        ctx.globalAlpha = alpha;
        
        // Priority-based Luminosity
        const lumGlow = 10 + (this.priority * 8);
        if (!isZooming) {
            ctx.shadowColor = drawColorStart;
            ctx.shadowBlur = this.isDecayed ? 5 : (this.isWaning ? 10 : lumGlow);
        }

        const gradient = ctx.createLinearGradient(
            drawX - this.radius, drawY - this.radius, 
            drawX + this.radius, drawY + this.radius
        );
        gradient.addColorStop(0, drawColorStart);
        gradient.addColorStop(1, drawColorEnd);

        ctx.beginPath();
        ctx.arc(drawX, drawY, this.radius, 0, Math.PI * 2);

        if (this.children.length > 0) {
            ctx.globalAlpha = 0.2 * alpha;
            ctx.fillStyle = gradient;
            ctx.fill();
            ctx.globalAlpha = 0.7 * alpha; 
            ctx.strokeStyle = drawColorStart;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.globalAlpha = 1.0 * alpha; 
            ctx.shadowBlur = 0;

            this.children.forEach(child => {
                ctx.beginPath();
                ctx.arc(drawX + child.offsetX, drawY + child.offsetY, child.radius, 0, Math.PI * 2);
                ctx.fillStyle = this.isDecayed ? '#64748b' : child.colorStart;
                ctx.fill();
            });
        } else {
            ctx.fillStyle = gradient;
            ctx.fill();
        }

        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1.0;

        // --- TACTICAL LEADER LINE ---
        if (isFocused) {
            ctx.save();
            // Reset to screen coordinates for leader line
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            
            const screenX = (drawX + camOffsetX) + (window.innerWidth / 2);
            const screenY = (drawY + camOffsetY) + (window.innerHeight / 2);
            const meridian = window.innerHeight / 2;

            // Start from fixed HUD port
            const startX = 330; 
            const startY = meridian;

            // Find point on circumference closest to startX, startY
            const dx = startX - screenX;
            const dy = startY - screenY;
            const dist = Math.hypot(dx, dy);
            const anchorX = screenX + (dx / dist) * (this.radius + 5);
            const anchorY = screenY + (dy / dist) * (this.radius + 5);

            // Seamless Straight Line:
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(anchorX, anchorY);

            ctx.strokeStyle = this.colorStart;
            ctx.setLineDash([4, 4]);
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.5;
            ctx.stroke();

            // Intersection point (glow)
            ctx.beginPath();
            ctx.arc(anchorX, anchorY, 3, 0, Math.PI * 2);
            ctx.fillStyle = this.colorStart;
            ctx.fill();

            ctx.restore();
        }
    }
}