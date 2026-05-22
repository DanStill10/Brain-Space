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
    constructor(dbId, text, x, y, colorTheme, priority, ctx) {
        this.id = dbId; 
        this.text = text;
        this.x = x;
        this.y = y;
        this.priority = priority || 0;
        
        // Radius Animation Setup
        this.baseRadius = Math.max(50, Math.min(95, text.length * 2.5)) + (this.priority * 4);
        this.radius = 0; 
        this.targetRadius = this.baseRadius;

        // Physics
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
        
        // Colors
        const selectedTheme = colorTheme && colorMap[colorTheme] ? colorTheme : colorKeys[Math.floor(Math.random() * colorKeys.length)];
        const colorSet = colorMap[selectedTheme];
        this.colorStart = colorSet[0];
        this.colorEnd = colorSet[1];
        
        const maxTextWidth = this.baseRadius * 1.6; 
        this.lines = wrapText(ctx, this.text, maxTextWidth, 3); 

        // Drag & Lava Setup
        this.isDragging = false;
        this.children = [];
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
        // Pop-in animation: Grow radius smoothly toward target!
        this.radius += (this.targetRadius - this.radius) * 0.1;

        if (!this.isDragging) {
            this.x += this.vx;
            this.y += this.vy;
            
            // Wall bounce
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
                        // Push apart slightly
                        const angle = Math.atan2(dy, dx);
                        const overlap = minDistance - distance;
                        this.x -= overlap * Math.cos(angle) * 0.5;
                        this.y -= overlap * Math.sin(angle) * 0.5;
                        other.x += overlap * Math.cos(angle) * 0.5;
                        other.y += overlap * Math.sin(angle) * 0.5;
                        
                        // Simple velocity swap for bouncing
                        const tempVx = this.vx;
                        const tempVy = this.vy;
                        this.vx = other.vx;
                        this.vy = other.vy;
                        other.vx = tempVx;
                        other.vy = tempVy;
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
                
                // If lava hits inner glass, bounce it
                if (distFromCenter > this.radius - child.radius - 4) {
                    child.dx *= -1;
                    child.dy *= -1;
                }
            });
        }
    }

    draw(ctx, currentZoom = 1) {
        if (this.radius < 1) return; // Prevent crashing while invisible

        ctx.shadowColor = this.colorStart;
        ctx.shadowBlur = 20;

        // Base gradient
        const gradient = ctx.createLinearGradient(
            this.x - this.radius, this.y - this.radius, 
            this.x + this.radius, this.y + this.radius
        );
        gradient.addColorStop(0, this.colorStart);
        gradient.addColorStop(1, this.colorEnd);

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);

        // --- THE GOOGLE EARTH EFFECT ---
        // As the camera zooms past 2.0x, the text and rim fade away like clouds!
        let surfaceAlpha = 1.0;
        if (currentZoom > 1.5) {
            surfaceAlpha = Math.max(0, 1.0 - ((currentZoom - 1.5) * 0.5));
        }

        if (this.children.length > 0) {
            // LAVA LAMP MODE
            ctx.globalAlpha = 0.2; // Background glass
            ctx.fillStyle = gradient;
            ctx.fill();
            
            ctx.globalAlpha = 0.7 * surfaceAlpha; // Rim fades out when zoomed
            ctx.strokeStyle = this.colorStart;
            ctx.lineWidth = 3;
            ctx.stroke();

            ctx.globalAlpha = 1.0; 
            ctx.shadowBlur = 0;

            // Draw children (Lava blobs) inside - These DO NOT fade out!
            this.children.forEach(child => {
                const childGrad = ctx.createLinearGradient(
                    this.x + child.offsetX - child.radius, this.y + child.offsetY - child.radius, 
                    this.x + child.offsetX + child.radius, this.y + child.offsetY + child.radius
                );
                childGrad.addColorStop(0, child.colorStart);
                childGrad.addColorStop(1, child.colorEnd);

                ctx.beginPath();
                ctx.arc(this.x + child.offsetX, this.y + child.offsetY, child.radius, 0, Math.PI * 2);
                ctx.fillStyle = childGrad;
                ctx.fill();
            });

        } else {
            // NORMAL SOLO MODE
            ctx.fillStyle = gradient;
            ctx.fill();
        }

        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1.0;

        // Draw Text & Badges (Fades out when zooming)
        if (this.radius > 20 && surfaceAlpha > 0) {
            ctx.globalAlpha = surfaceAlpha; // Apply the cloud fade
            
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            const lineHeight = 18; 
            const totalHeight = this.lines.length * lineHeight;
            const startY = this.y - (totalHeight / 2) + (lineHeight / 2);

            ctx.font = '500 14px system-ui';
            ctx.lineWidth = 4; 
            ctx.strokeStyle = `rgba(0, 0, 0, ${0.5 * surfaceAlpha})`; 
            ctx.fillStyle = 'white'; 

            this.lines.forEach((line, index) => {
                const lineY = startY + (index * lineHeight);
                ctx.strokeText(line, this.x, lineY);
                ctx.fillText(line, this.x, lineY);
            });

            // Draw Priority Badge
            if (this.priority > 0) {
                const badgeRadius = 10;
                const angle = -Math.PI / 4; 
                const badgeX = this.x + Math.cos(angle) * this.radius;
                const badgeY = this.y + Math.sin(angle) * this.radius;

                ctx.beginPath();
                ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
                ctx.fillStyle = '#1e293b'; 
                ctx.fill();
                
                ctx.strokeStyle = this.colorStart;
                ctx.lineWidth = 2;
                ctx.stroke();

                ctx.fillStyle = 'white';
                ctx.font = 'bold 11px system-ui';
                ctx.fillText(this.priority.toString(), badgeX, badgeY);
            }
            
            ctx.globalAlpha = 1.0; // Reset alpha for the next bubble
        }
    }
}