export class Particle {
    constructor(canvasWidth, canvasHeight) {
        this.x = Math.random() * canvasWidth;
        this.y = Math.random() * canvasHeight;
        this.z = Math.random(); 
        
        this.radius = (this.z * 1.5) + 0.5; 
        const speedBase = (this.z * 0.3) + 0.05;
        
        this.vx = (Math.random() - 0.5) * speedBase;
        this.vy = -(Math.random() * speedBase) - 0.1;
        
        this.baseAlpha = (this.z * 0.5) + 0.1;
        this.alphaOffset = Math.random() * Math.PI * 2;
        this.twinkleSpeed = (Math.random() * 0.03) + 0.01;
    }

    update(canvasWidth, canvasHeight) {
        this.x += this.vx;
        this.y += this.vy;
        this.alphaOffset += this.twinkleSpeed;

        if (this.x < -10) this.x = canvasWidth + 10;
        if (this.x > canvasWidth + 10) this.x = -10;
        if (this.y < -10) this.y = canvasHeight + 10;
        if (this.y > canvasHeight + 10) this.y = -10;
    }

    draw(ctx) {
        const currentAlpha = this.baseAlpha + (Math.sin(this.alphaOffset) * 0.2);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(148, 163, 184, ${Math.max(0, currentAlpha)})`; 
        ctx.fill();
    }
}