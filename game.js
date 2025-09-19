class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.tileSize = 20;
        this.cols = 40;
        this.rows = 30;
        
        this.score = 0;
        this.level = 1;
        this.lives = 3;
        this.gameState = 'waiting'; // waiting, playing, gameOver
        this.powerUpTime = 0;
        
        this.player = { x: 1, y: 1, size: 18 };
        this.enemies = [];
        this.coins = [];
        this.powerUps = [];
        this.maze = [];
        
        this.keys = {};
        this.setupEvents();
        this.generateMaze();
        this.gameLoop();
    }
    
    setupEvents() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.code === 'Space') {
                e.preventDefault();
                if (this.gameState !== 'playing') {
                    this.startGame();
                }
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }
    
    generateMaze() {
        // Simple maze generation - 1 = wall, 0 = path
        this.maze = Array(this.rows).fill().map(() => Array(this.cols).fill(1));
        
        // Create paths
        for (let y = 1; y < this.rows - 1; y += 2) {
            for (let x = 1; x < this.cols - 1; x += 2) {
                this.maze[y][x] = 0;
                
                // Random connections
                if (Math.random() > 0.3 && x < this.cols - 2) {
                    this.maze[y][x + 1] = 0;
                }
                if (Math.random() > 0.3 && y < this.rows - 2) {
                    this.maze[y + 1][x] = 0;
                }
            }
        }
        
        // Ensure player start is clear
        this.maze[1][1] = 0;
        this.maze[1][2] = 0;
        this.maze[2][1] = 0;
    }
    
    startGame() {
        this.gameState = 'playing';
        this.player = { x: 1, y: 1, size: 18 };
        this.enemies = [];
        this.coins = [];
        this.powerUps = [];
        this.powerUpTime = 0;
        
        this.generateMaze();
        this.spawnItems();
        this.spawnEnemies();
    }
    
    spawnItems() {
        // Spawn coins
        for (let i = 0; i < 15 + this.level * 5; i++) {
            let x, y;
            do {
                x = Math.floor(Math.random() * this.cols);
                y = Math.floor(Math.random() * this.rows);
            } while (this.maze[y][x] === 1 || (x === 1 && y === 1));
            
            this.coins.push({ x, y, collected: false });
        }
        
        // Spawn power-ups
        for (let i = 0; i < 2 + Math.floor(this.level / 2); i++) {
            let x, y;
            do {
                x = Math.floor(Math.random() * this.cols);
                y = Math.floor(Math.random() * this.rows);
            } while (this.maze[y][x] === 1 || (x === 1 && y === 1));
            
            this.powerUps.push({ x, y, collected: false });
        }
    }
    
    spawnEnemies() {
        const enemyCount = 2 + this.level;
        for (let i = 0; i < enemyCount; i++) {
            let x, y;
            do {
                x = Math.floor(Math.random() * this.cols);
                y = Math.floor(Math.random() * this.rows);
            } while (this.maze[y][x] === 1 || (Math.abs(x - 1) + Math.abs(y - 1)) < 5);
            
            this.enemies.push({
                x, y, size: 16,
                moveTimer: Math.random() * 30,
                direction: Math.floor(Math.random() * 4)
            });
        }
    }
    
    update() {
        if (this.gameState !== 'playing') return;
        
        this.updatePlayer();
        this.updateEnemies();
        this.checkCollisions();
        
        if (this.powerUpTime > 0) {
            this.powerUpTime--;
        }
        
        // Check win condition
        if (this.coins.every(coin => coin.collected)) {
            this.level++;
            this.startGame();
        }
        
        this.updateUI();
    }
    
    updatePlayer() {
        let newX = this.player.x;
        let newY = this.player.y;
        
        if (this.keys['ArrowLeft']) newX -= 0.1;
        if (this.keys['ArrowRight']) newX += 0.1;
        if (this.keys['ArrowUp']) newY -= 0.1;
        if (this.keys['ArrowDown']) newY += 0.1;
        
        // Check collision with walls
        const margin = 0.4;
        if (this.maze[Math.floor(newY + margin)][Math.floor(newX + margin)] === 0 &&
            this.maze[Math.floor(newY + margin)][Math.ceil(newX - margin)] === 0 &&
            this.maze[Math.ceil(newY - margin)][Math.floor(newX + margin)] === 0 &&
            this.maze[Math.ceil(newY - margin)][Math.ceil(newX - margin)] === 0) {
            this.player.x = newX;
            this.player.y = newY;
        }
    }
    
    updateEnemies() {
        this.enemies.forEach(enemy => {
            enemy.moveTimer--;
            
            if (enemy.moveTimer <= 0) {
                enemy.moveTimer = 20 + Math.random() * 20;
                
                // Simple AI - move towards player occasionally
                if (Math.random() < 0.3) {
                    const dx = this.player.x - enemy.x;
                    const dy = this.player.y - enemy.y;
                    
                    if (Math.abs(dx) > Math.abs(dy)) {
                        enemy.direction = dx > 0 ? 1 : 3; // right : left
                    } else {
                        enemy.direction = dy > 0 ? 2 : 0; // down : up
                    }
                } else {
                    enemy.direction = Math.floor(Math.random() * 4);
                }
            }
            
            // Move enemy
            let newX = enemy.x;
            let newY = enemy.y;
            const speed = 0.05;
            
            switch (enemy.direction) {
                case 0: newY -= speed; break; // up
                case 1: newX += speed; break; // right
                case 2: newY += speed; break; // down
                case 3: newX -= speed; break; // left
            }
            
            // Check wall collision
            if (this.maze[Math.floor(newY)][Math.floor(newX)] === 0) {
                enemy.x = newX;
                enemy.y = newY;
            } else {
                enemy.direction = Math.floor(Math.random() * 4);
            }
        });
    }
    
    checkCollisions() {
        // Coin collection
        this.coins.forEach(coin => {
            if (!coin.collected && 
                Math.abs(this.player.x - coin.x) < 0.5 && 
                Math.abs(this.player.y - coin.y) < 0.5) {
                coin.collected = true;
                this.score += 10;
            }
        });
        
        // Power-up collection
        this.powerUps.forEach(powerUp => {
            if (!powerUp.collected && 
                Math.abs(this.player.x - powerUp.x) < 0.5 && 
                Math.abs(this.player.y - powerUp.y) < 0.5) {
                powerUp.collected = true;
                this.powerUpTime = 300; // 5 seconds at 60fps
                this.score += 50;
            }
        });
        
        // Enemy collision
        this.enemies.forEach((enemy, index) => {
            if (Math.abs(this.player.x - enemy.x) < 0.6 && 
                Math.abs(this.player.y - enemy.y) < 0.6) {
                
                if (this.powerUpTime > 0) {
                    // Defeat enemy
                    this.enemies.splice(index, 1);
                    this.score += 100;
                } else {
                    // Player hit
                    this.lives--;
                    if (this.lives <= 0) {
                        this.gameState = 'gameOver';
                    } else {
                        this.player.x = 1;
                        this.player.y = 1;
                    }
                }
            }
        });
    }
    
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw maze
        this.ctx.fillStyle = '#444';
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                if (this.maze[y][x] === 1) {
                    this.ctx.fillRect(x * this.tileSize, y * this.tileSize, 
                                    this.tileSize, this.tileSize);
                }
            }
        }
        
        // Draw coins
        this.ctx.fillStyle = '#FFD700';
        this.coins.forEach(coin => {
            if (!coin.collected) {
                this.ctx.fillRect(coin.x * this.tileSize + 6, coin.y * this.tileSize + 6, 8, 8);
            }
        });
        
        // Draw power-ups
        this.ctx.fillStyle = '#00FF00';
        this.powerUps.forEach(powerUp => {
            if (!powerUp.collected) {
                this.ctx.fillRect(powerUp.x * this.tileSize + 4, powerUp.y * this.tileSize + 4, 12, 12);
            }
        });
        
        // Draw enemies
        this.ctx.fillStyle = this.powerUpTime > 0 ? '#0088FF' : '#FF4444';
        this.enemies.forEach(enemy => {
            this.ctx.fillRect(enemy.x * this.tileSize + 2, enemy.y * this.tileSize + 2, 
                            enemy.size, enemy.size);
        });
        
        // Draw player
        this.ctx.fillStyle = this.powerUpTime > 0 ? '#FFFF00' : '#00AAFF';
        this.ctx.fillRect(this.player.x * this.tileSize + 1, this.player.y * this.tileSize + 1, 
                         this.player.size, this.player.size);
        
        // Draw game over screen
        if (this.gameState === 'gameOver') {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.fillStyle = '#FFF';
            this.ctx.font = '48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2);
            this.ctx.font = '24px Arial';
            this.ctx.fillText('Press SPACE to restart', this.canvas.width / 2, this.canvas.height / 2 + 50);
        }
        
        if (this.gameState === 'waiting') {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.fillStyle = '#FFF';
            this.ctx.font = '48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('CUBE DASH', this.canvas.width / 2, this.canvas.height / 2);
            this.ctx.font = '24px Arial';
            this.ctx.fillText('Press SPACE to start', this.canvas.width / 2, this.canvas.height / 2 + 50);
        }
    }
    
    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('level').textContent = this.level;
        document.getElementById('lives').textContent = this.lives;
    }
    
    gameLoop() {
        this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Start the game
new Game();