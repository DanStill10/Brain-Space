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
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        
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

        // Decay & Gravity State
        this.isDecayed = false;
        this.mass = this.baseRadius; 
        this.vortexAngle = Math.random() * Math.PI * 2; 
    }

    absorb(childNode) {
        // --- PERSISTENCE FIX ---
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
            radius: 18,
            offsetX: (Math.random() - 0.5) * 20,
            offsetY: (Math.random() - 0.5) * 20,
            dx: (Math.random() - 0.5) * 1.5,
            dy: (Math.random() - 0.5) * 1.5
        });

        this.targetRadius = this.baseRadius + (this.children.length * 10);
        this.mass = this.baseRadius + (this.children.length * 15);
    }

    update(ideasArray, width, height) {
        const msPerDay = 86400000;
        const age = new Date() - this.lastInteractedAt;
        
        this.isWaning = age > msPerDay && age <= msPerDay * 3;
        this.isDecayed = age > msPerDay * 3;

        const activeMass = this.baseRadius + (this.children.length * 15);
        this.mass = this.isDecayed ? 0.1 : activeMass;

        this.radius += (this.targetRadius - this.radius) * 0.1;

        // Visual Rotation (Space-Age Accretion Disk Speed)
        if (this.children.length > 0) {
            this.vortexAngle += 0.008 + (this.children.length * 0.003);
        }

        if (!this.isDragging) {
            let multiplier = this.isDecayed ? 0.2 : (this.isWaning ? 0.5 : 1.0);
            this.x += this.vx * multiplier;
            this.y += this.vy * multiplier;

            let currentDamping = 0.995;

            const minSpeed = this.isDecayed ? 0.05 : 0.15;
            const currentSpeed = Math.hypot(this.vx, this.vy);
            if (currentSpeed < minSpeed) {
                const angle = Math.random() * Math.PI * 2;
                this.vx += Math.cos(angle) * 0.05;
                this.vy += Math.sin(angle) * 0.05;
            }

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
                const minDistance = this.radius + other.radius;

                if (this.children.length > 0 && other.children.length > 0) {
                    const repelZone = minDistance + 40; 
                    if (distance < repelZone) {
                        const proximity = (1 - distance / repelZone);
                        const force = proximity * 4; 
                        const angle = Math.atan2(dy, dx);
                        this.vx -= Math.cos(angle) * force;
                        this.vy -= Math.sin(angle) * force;
                        if (other.isDragging) {
                            this.vx -= Math.cos(angle) * force * 2.5;
                            this.vy -= Math.sin(angle) * force * 2.5;
                        }
                        currentDamping = 1.0; 
                    }
                }

                if (other.isDragging) continue;

                if (!this.isDecayed && this.children.length > 0 && other.children.length === 0 && distance < 450 && distance > minDistance) {
                    const gravitationalConstant = 2.5; 
                    const forceStrength = (this.mass / (distance * distance)) * gravitationalConstant; 
                    const ax = (dx / distance) * forceStrength;
                    const ay = (dy / distance) * forceStrength;
                    const tx = -ay * 1.2; 
                    const ty = ax * 1.2;
                    other.vx -= (ax * 0.3) + tx;
                    other.vy -= (ay * 0.3) + ty;
                }

                if (distance < minDistance) {
                    const angle = Math.atan2(dy, dx);
                    const overlap = minDistance - distance;
                    const isParentCollision = this.children.length > 0 && other.children.length > 0;
                    const totalMass = this.mass + other.mass;
                    const r1 = isParentCollision ? 0.5 : (other.mass / totalMass);
                    const r2 = isParentCollision ? 0.5 : (this.mass / totalMass);
                    const correctionStrength = isParentCollision ? 0.9 : 1.0;

                    this.x -= overlap * Math.cos(angle) * r1 * correctionStrength;
                    this.y -= overlap * Math.sin(angle) * r1 * correctionStrength;
                    other.x += overlap * Math.cos(angle) * r2 * correctionStrength;
                    other.y += overlap * Math.sin(angle) * r2 * correctionStrength;
                    
                    const vRelX = this.vx - other.vx;
                    const vRelY = this.vy - other.vy;
                    const nx = dx / distance;
                    const ny = dy / distance;
                    const dot = vRelX * nx + vRelY * ny;
                    if (dot < 0) {
                        const restitution = 0.7;
                        const m1_eff = isParentCollision ? 200 : this.mass;
                        const m2_eff = isParentCollision ? 200 : other.mass;
                        const impulse = ((1 + restitution) * dot) / (m1_eff + m2_eff);
                        this.vx -= impulse * m2_eff * nx;
                        this.vy -= impulse * m2_eff * ny;
                        other.vx += impulse * m1_eff * nx;
                        other.vy += impulse * m1_eff * ny;
                    }
                    if (isParentCollision) currentDamping = 1.0;
                }
            }

            this.vx *= currentDamping;
            this.vy *= currentDamping;

            const margin = this.radius + 40;
            const pushBack = 0.05;
            if (this.x < margin) this.vx += pushBack;
            if (this.x > width - margin) this.vx -= pushBack;
            if (this.y < margin) this.vy += pushBack;
            if (this.y > height - margin) this.vy -= pushBack;

            if (this.x < this.radius) {
                this.x = this.radius;
                this.vx = Math.abs(this.vx) * 0.5;
            } else if (this.x > width - this.radius) {
                this.x = width - this.radius;
                this.vx = -Math.abs(this.vx) * 0.5;
            }
            if (this.y < this.radius) {
                this.y = this.radius;
                this.vy = Math.abs(this.vy) * 0.5;
            } else if (this.y > height - this.radius) {
                this.y = height - this.radius;
                this.vy = -Math.abs(this.vy) * 0.5;
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
    }

    draw(ctx, currentZoom = 1) {
        if (this.radius < 1) return;

        // --- DRAW SPACE-AGE VORTEX (Behind the node) ---
        if (this.children.length > 0 && !this.isDecayed) {
            ctx.save();
            ctx.translate(this.x, this.y);
            
            // 1. GRAVITY WELL BLOOM (Visualizing the space dip)
            const gravityRadius = 450;
            const bloomAlpha = 0.02 + (this.children.length * 0.005);
            const grad = ctx.createRadialGradient(0, 0, this.radius, 0, 0, gravityRadius);
            grad.addColorStop(0, `${this.colorStart}${Math.floor(bloomAlpha * 255).toString(16).padStart(2, '0')}`);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, gravityRadius, 0, Math.PI * 2);
            ctx.fill();

            // 2. FLOWING ENERGY FILAMENTS
            const numRings = Math.min(4, Math.ceil(this.children.length / 1.5));
            for (let i = 1; i <= numRings; i++) {
                const ringRadius = this.radius + (i * 35) + (Math.sin(Date.now() * 0.001) * 2);
                const rotationSpeed = this.vortexAngle * (i % 2 === 0 ? -1 : 1.2) * (0.8 / i);
                
                ctx.save();
                ctx.rotate(rotationSpeed);
                
                // Draw 3 distinct filaments per orbital ring
                for (let f = 0; f < 3; f++) {
                    ctx.rotate((Math.PI * 2) / 3);
                    ctx.beginPath();
                    // Each filament is a soft arc with varying lengths
                    const arcLen = (Math.PI / 4) + (this.children.length * 0.1);
                    ctx.arc(0, 0, ringRadius, 0, arcLen);
                    
                    ctx.strokeStyle = this.colorStart;
                    ctx.lineWidth = 1 + (i * 0.5);
                    ctx.lineCap = 'round';
                    ctx.globalAlpha = (0.1 + (this.children.length * 0.02)) / i;
                    
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = this.colorStart;
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
        ctx.shadowColor = drawColorStart;
        ctx.shadowBlur = this.isDecayed ? 5 : (this.isWaning ? 10 : 20);

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
                const childGrad = ctx.createRadialGradient(
                    this.x + child.offsetX, this.y + child.offsetY, 0,
                    this.x + child.offsetX, this.y + child.offsetY, child.radius
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