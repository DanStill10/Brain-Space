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
        
        this.baseRadius = Math.max(50, Math.min(95, text.length * 2.5)) + (this.priority * 4);
        this.radius = 0;
        this.targetRadius = this.baseRadius;

        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
        this.maxSpeed = Math.random() * 0.4 + 0.6;
        this.wanderAngle = Math.random() * Math.PI * 2;

        const selectedTheme = colorTheme ? colorTheme : colorKeys[Math.floor(Math.random() * colorKeys.length)];
        const colorSet = colorMap[selectedTheme];
        this.colorStart = colorSet[0];
        this.colorEnd = colorSet[1];
        
        const maxTextWidth = this.baseRadius * 1.6; 
        this.lines = wrapText(ctx, this.text, maxTextWidth, 3); 
    }

    update(ideasArray, canvasWidth, canvasHeight) {
        if (this.radius < this.targetRadius) {
            this.radius += (this.targetRadius - this.radius) * 0.1;
        }

        this.wanderAngle += (Math.random() - 0.5) * 0.4;
        let forceX = Math.cos(this.wanderAngle) * 0.05;
        let forceY = Math.sin(this.wanderAngle) * 0.05;

        const margin = this.radius + 50; 
        if (this.x < margin) forceX += 0.1;
        if (this.x > canvasWidth - margin) forceX -= 0.1;
        if (this.y < margin) forceY += 0.1;
        if (this.y > canvasHeight - margin) forceY -= 0.1;

        this.vx += forceX;
        this.vy += forceY;

        this.vx *= 0.98;
        this.vy *= 0.98;

        for (let other of ideasArray) {
            if (other === this) continue;
            
            const dx = this.x - other.x;
            const dy = this.y - other.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const minDistance = this.radius + other.radius + 10; 

            if (distance < minDistance) {
                const angle = Math.atan2(dy, dx);
                const force = (minDistance - distance) * 0.05;
                const ax = Math.cos(angle) * force;
                const ay = Math.sin(angle) * force;

                this.vx += ax;
                this.vy += ay;
                other.vx -= ax;
                other.vy -= ay;
            }
        }

        const speedSq = this.vx * this.vx + this.vy * this.vy;
        if (speedSq > this.maxSpeed * this.maxSpeed) {
            const speed = Math.sqrt(speedSq);
            this.vx = (this.vx / speed) * this.maxSpeed;
            this.vy = (this.vy / speed) * this.maxSpeed;
        }

        this.x += this.vx;
        this.y += this.vy;

        if (this.x - this.radius < 0) { this.x = this.radius; this.vx *= -1; }
        if (this.x + this.radius > canvasWidth) { this.x = canvasWidth - this.radius; this.vx *= -1; }
        if (this.y - this.radius < 0) { this.y = this.radius; this.vy *= -1; }
        if (this.y + this.radius > canvasHeight) { this.y = canvasHeight - this.radius; this.vy *= -1; }
    }

    draw(ctx) {
        ctx.shadowColor = this.colorStart;
        ctx.shadowBlur = 20;

        const gradient = ctx.createLinearGradient(
            this.x - this.radius, this.y - this.radius, 
            this.x + this.radius, this.y + this.radius
        );
        gradient.addColorStop(0, this.colorStart);
        gradient.addColorStop(1, this.colorEnd);

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.shadowBlur = 0;

        if (this.radius > 20) {
            ctx.fillStyle = 'white';
            ctx.font = '500 14px system-ui';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            const lineHeight = 18; 
            const totalHeight = this.lines.length * lineHeight;
            const startY = this.y - (totalHeight / 2) + (lineHeight / 2);

            this.lines.forEach((line, index) => {
                ctx.fillText(line, this.x, startY + (index * lineHeight));
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
                
                ctx.strokeStyle = this.colorStart;
                ctx.lineWidth = 2;
                ctx.stroke();

                ctx.fillStyle = 'white';
                ctx.font = 'bold 11px system-ui';
                ctx.fillText(this.priority.toString(), badgeX, badgeY);
            }
        }
    }
}