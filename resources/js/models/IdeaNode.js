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

export class IdeaNode {
    constructor(dbId, text, x, y, colorTheme, priority, ctx, lastInteractedAt) {
        this.id = dbId; 
        this.text = text;
        this.x = x;
        this.y = y;
        this.priority = priority || 0;
        this.lastInteractedAt = lastInteractedAt ? new Date(lastInteractedAt) : new Date();
        
        // Radius Animation Setup
        this.baseRadius = Math.max(50, Math.min(95, text.length * 2.5)) + (this.priority * 4);
        this.radius = 0; 
        this.targetRadius = this.baseRadius;

        // Physics
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
        
        // Colors
        const selectedTheme = colorTheme && colorMap[colorTheme] ? colorTheme : colorKeys[Math.floor(Math.random() * colorKeys.length)];
        this.colorTheme = selectedTheme;
        const colorSet = colorMap[selectedTheme];
        this.colorStart = colorSet[0];
        this.colorEnd = colorSet[1];
        
        const maxTextWidth = this.baseRadius * 1.6; 
        this.lines = wrapText(ctx, this.text, maxTextWidth, 3); 

        // Drag & Lava Setup
        this.isDragging = false;
        this.children = [];

        // Decay State
        this.isDecayed = false;
    }

    absorb(childNode) {
        // --- PERSISTENCE FIX ---
        // If childNode is a live bubble, it has colorStart. 
        // If it's loaded from the DB, it only has a 'color' string (e.g., 'blue').
        let cStart = childNode.colorStart;
        let cEnd = childNode.colorEnd;

        if (!cStart || !cEnd) {
            // Rebuild the colors from the database theme string
            const theme = childNode.color && colorMap[childNode.color] ? childNode.color : 'blue';
            cStart = colorMap[theme][0];
            cEnd = colorMap[theme][1];
        }

        this.children.push({
            id: childNode.id,
            text: childNode.text,
            colorStart: cStart,
            colorEnd: cEnd,
            radius: 18,
            offsetX: (Math.random() - 0.5) * 20,
            offsetY: (Math.random() - 0.5) * 20,
            dx: (Math.random() - 0.5) * 1.5,
            dy: (Math.random() - 0.5) * 1.5
        });

        // Increase target radius so it slowly grows!
        this.targetRadius = this.baseRadius + (this.children.length * 10);
    }

    update(ideasArray, width, height) {
        const msPerDay = 86400000;
        const age = new Date() - this.lastInteractedAt;
        
        // Stage thresholds
        this.isWaning = age > msPerDay && age <= msPerDay * 3;
        this.isDecayed = age > msPerDay * 3;

        // Pop-in animation: Grow radius smoothly toward target!
        this.radius += (this.targetRadius - this.radius) * 0.1;

        if (!this.isDragging) {
            // Decay Multiplier
            let multiplier = 1.0;
            if (this.isDecayed) multiplier = 0.2;
            else if (this.isWaning) multiplier = 0.5;
            
            this.x += this.vx * multiplier;
            this.y += this.vy * multiplier;

            // Edge Drift (Only for fully decayed)
            if (this.isDecayed) {
                const steerForce = 0.02;
                if (this.x < width / 2) this.vx -= steerForce; else this.vx += steerForce;
                if (this.y < height / 2) this.vy -= steerForce; else this.vy += steerForce;
                
                const maxDecaySpeed = 0.5;
                const speed = Math.hypot(this.vx, this.vy);
                if (speed > maxDecaySpeed) {
                    this.vx = (this.vx / speed) * maxDecaySpeed;
                    this.vy = (this.vy / speed) * maxDecaySpeed;
                }
            }
            
            // Wall bounce (standard)
            if (this.x + this.radius > width || this.x - this.radius < 0) this.vx *= -1;
            if (this.y + this.radius > height || this.y - this.radius < 0) this.vy *= -1;

            // Bubble-to-Bubble Collision Math
            for (let other of ideasArray) {
                if (other !== this && !other.isDragging) {
                    const dx = other.x - this.x;
                    const dy = other.y - this.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const minDistance = this.radius + other.radius;

                        if (distance < minDistance) {
                            const angle = Math.atan2(dy, dx);
                            const overlap = minDistance - distance;
                            
                            // 1. Position correction (Push apart)
                            // We push ghosts much further than active nodes
                            const m1 = this.isDecayed ? 0.1 : 1.0;
                            const m2 = other.isDecayed ? 0.1 : 1.0;
                            const totalMass = m1 + m2;
                            
                            const ratio1 = m2 / totalMass;
                            const ratio2 = m1 / totalMass;
                            
                            this.x -= overlap * Math.cos(angle) * ratio1;
                            this.y -= overlap * Math.sin(angle) * ratio1;
                            other.x += overlap * Math.cos(angle) * ratio2;
                            other.y += overlap * Math.sin(angle) * ratio2;
                            
                            // 2. Velocity exchange (Mass-weighted)
                            // This allows Heavy (Active) nodes to blast through Light (Ghost) nodes
                            const vRelX = this.vx - other.vx;
                            const vRelY = this.vy - other.vy;
                            
                            // Dot product of relative velocity and collision normal
                            const nx = dx / distance;
                            const ny = dy / distance;
                            const dot = vRelX * nx + vRelY * ny;
                            
                            if (dot < 0) { // Only bounce if moving toward each other
                                const impulse = (2 * dot) / totalMass;
                                this.vx -= impulse * m2 * nx;
                                this.vy -= impulse * m2 * ny;
                                other.vx += impulse * m1 * nx;
                                other.vy += impulse * m1 * ny;
                            }
                        }
                }
            }
        }

        // Internal Lava Physics
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
    }

    draw(ctx, currentZoom = 1) {
        if (this.radius < 1) return;

        let drawColorStart = this.colorStart;
        let drawColorEnd = this.colorEnd;
        let alpha = 1.0;

        if (this.isDecayed) {
            drawColorStart = '#94a3b8'; // Ghosted (Slate)
            drawColorEnd = '#475569';
            alpha = 0.3;
        } else if (this.isWaning) {
            // Waning: Blend original color with slate (50/50 mix)
            // We use a CSS-like filter approach by lowering alpha and shadow
            alpha = 0.65;
        }

        ctx.globalAlpha = alpha;
        ctx.shadowColor = drawColorStart;
        ctx.shadowBlur = this.isDecayed ? 5 : (this.isWaning ? 10 : 20);

        // Base gradient
        const gradient = ctx.createLinearGradient(
            this.x - this.radius, this.y - this.radius, 
            this.x + this.radius, this.y + this.radius
        );
        gradient.addColorStop(0, drawColorStart);
        gradient.addColorStop(1, drawColorEnd);

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);

        let surfaceAlpha = 1.0;
        if (currentZoom > 1.5) {
            surfaceAlpha = Math.max(0, 1.0 - ((currentZoom - 1.5) * 0.5));
        }

        if (this.children.length > 0) {
            ctx.globalAlpha = 0.2 * alpha;
            ctx.fillStyle = gradient;
            ctx.fill();
            
            ctx.globalAlpha = 0.7 * surfaceAlpha * alpha; 
            ctx.strokeStyle = drawColorStart;
            ctx.lineWidth = 3;
            ctx.stroke();

            ctx.globalAlpha = 1.0 * alpha; 
            ctx.shadowBlur = 0;

            this.children.forEach(child => {
                let childColorStart = child.colorStart;
                let childColorEnd = child.colorEnd;
                if (this.isDecayed) {
                    childColorStart = '#64748b';
                    childColorEnd = '#334155';
                }

                const childGrad = ctx.createLinearGradient(
                    this.x + child.offsetX - child.radius, this.y + child.offsetY - child.radius, 
                    this.x + child.offsetX + child.radius, this.y + child.offsetY + child.radius
                );
                childGrad.addColorStop(0, childColorStart);
                childGrad.addColorStop(1, childColorEnd);

                ctx.beginPath();
                ctx.arc(this.x + child.offsetX, this.y + child.offsetY, child.radius, 0, Math.PI * 2);
                ctx.fillStyle = childGrad;
                ctx.fill();
            });
        } else {
            ctx.fillStyle = gradient;
            ctx.fill();
        }

        ctx.shadowBlur = 0;
        ctx.globalAlpha = alpha;

        if (this.radius > 20 && surfaceAlpha > 0) {
            ctx.globalAlpha = surfaceAlpha * alpha; 
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            const lineHeight = 18; 
            const totalHeight = this.lines.length * lineHeight;
            const startY = this.y - (totalHeight / 2) + (lineHeight / 2);

            ctx.font = '500 14px system-ui';
            ctx.lineWidth = 4; 
            ctx.strokeStyle = `rgba(0, 0, 0, ${0.5 * surfaceAlpha * alpha})`; 
            ctx.fillStyle = this.isDecayed ? '#cbd5e1' : 'white'; 

            this.lines.forEach((line, index) => {
                const lineY = startY + (index * lineHeight);
                ctx.strokeText(line, this.x, lineY);
                ctx.fillText(line, this.x, lineY);
            });

            if (this.priority > 0) {
                const badgeRadius = 10;
                const angle = -Math.PI / 4; 
                const badgeX = this.x + Math.cos(angle) * this.radius;
                const badgeY = this.y + Math.sin(angle) * this.radius;

                ctx.beginPath();
                ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
                ctx.fillStyle = '#1e293b'; 
                ctx.fill();
                
                ctx.strokeStyle = drawColorStart;
                ctx.lineWidth = 2;
                ctx.stroke();

                ctx.fillStyle = 'white';
                ctx.font = 'bold 11px system-ui';
                ctx.fillText(this.priority.toString(), badgeX, badgeY);
            }
        }
        ctx.globalAlpha = 1.0;
    }
}