export class Particle {
    constructor(worldWidth, worldHeight) {
        this.x = (Math.random() - 0.5) * worldWidth;
        this.y = (Math.random() - 0.5) * worldHeight;
        this.z = Math.random(); 
        
        this.radius = (this.z * 1.5) + 0.5; 
        const speedBase = (this.z * 0.2) + 0.05;
        
        this.vx = (Math.random() - 0.5) * speedBase;
        this.vy = (Math.random() - 0.5) * speedBase;
        
        this.baseAlpha = (this.z * 0.4) + 0.1;
        this.alphaOffset = Math.random() * Math.PI * 2;
        this.twinkleSpeed = (Math.random() * 0.03) + 0.01;
    }

    update(worldWidth, worldHeight) {
        this.x += this.vx;
        this.y += this.vy;
        this.alphaOffset += this.twinkleSpeed;

        const hw = worldWidth / 2;
        const hh = worldHeight / 2;

        if (this.x < -hw) this.x = hw;
        if (this.x > hw) this.x = -hw;
        if (this.y < -hh) this.y = hh;
        if (this.y > hh) this.y = -hh;
    }

    draw(ctx) {
        const currentAlpha = this.baseAlpha + (Math.sin(this.alphaOffset) * 0.2);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(148, 163, 184, ${Math.max(0, currentAlpha)})`; 
        ctx.fill();
    }
}