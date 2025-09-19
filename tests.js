// Simple test framework
class TestRunner {
    constructor() {
        this.tests = [];
        this.results = [];
    }
    
    test(name, fn) {
        this.tests.push({ name, fn });
    }
    
    async run() {
        for (const test of this.tests) {
            try {
                await test.fn();
                this.results.push({ name: test.name, status: 'pass' });
                this.log(test.name, 'pass');
            } catch (error) {
                this.results.push({ name: test.name, status: 'fail', error: error.message });
                this.log(test.name, 'fail', error.message);
            }
        }
        this.showSummary();
    }
    
    log(name, status, error = '') {
        const div = document.createElement('div');
        div.className = `test-result ${status}`;
        div.innerHTML = `<strong>${status.toUpperCase()}</strong>: ${name}${error ? `<br>Error: ${error}` : ''}`;
        document.getElementById('test-results').appendChild(div);
    }
    
    showSummary() {
        const passed = this.results.filter(r => r.status === 'pass').length;
        const failed = this.results.filter(r => r.status === 'fail').length;
        const total = this.results.length;
        
        const summary = document.getElementById('test-summary');
        summary.innerHTML = `
            <h2>Test Summary</h2>
            <p>Total: ${total} | Passed: ${passed} | Failed: ${failed}</p>
            <p>Success Rate: ${((passed / total) * 100).toFixed(1)}%</p>
        `;
    }
    
    assert(condition, message) {
        if (!condition) {
            throw new Error(message || 'Assertion failed');
        }
    }
    
    assertEqual(actual, expected, message) {
        if (actual !== expected) {
            throw new Error(message || `Expected ${expected}, got ${actual}`);
        }
    }
}

// Mock canvas for testing
const mockCanvas = {
    getContext: () => ({
        clearRect: () => {},
        fillRect: () => {},
        fillText: () => {},
        measureText: () => ({ width: 100 })
    }),
    width: 800,
    height: 600
};

// Mock DOM elements
const mockElements = {
    score: { textContent: '0' },
    level: { textContent: '1' },
    lives: { textContent: '3' }
};

// Override document methods for testing
const originalGetElementById = document.getElementById;
document.getElementById = function(id) {
    if (id === 'gameCanvas') return mockCanvas;
    if (mockElements[id]) return mockElements[id];
    return originalGetElementById.call(this, id);
};

// Test Suite
const runner = new TestRunner();

// Unit Tests - Game Initialization
runner.test('Game initializes with correct default values', () => {
    const game = new Game();
    runner.assertEqual(game.score, 0, 'Initial score should be 0');
    runner.assertEqual(game.level, 1, 'Initial level should be 1');
    runner.assertEqual(game.lives, 3, 'Initial lives should be 3');
    runner.assertEqual(game.gameState, 'waiting', 'Initial state should be waiting');
    runner.assert(game.player.x === 1 && game.player.y === 1, 'Player should start at position (1,1)');
});

// Unit Tests - Maze Generation
runner.test('Maze generates with correct dimensions', () => {
    const game = new Game();
    runner.assertEqual(game.maze.length, game.rows, 'Maze should have correct number of rows');
    runner.assertEqual(game.maze[0].length, game.cols, 'Maze should have correct number of columns');
    runner.assertEqual(game.maze[1][1], 0, 'Player start position should be clear');
});

// Unit Tests - Item Spawning
runner.test('Items spawn correctly when game starts', () => {
    const game = new Game();
    game.startGame();
    
    const expectedCoins = 15 + game.level * 5;
    const expectedPowerUps = 2 + Math.floor(game.level / 2);
    
    runner.assertEqual(game.coins.length, expectedCoins, `Should spawn ${expectedCoins} coins`);
    runner.assertEqual(game.powerUps.length, expectedPowerUps, `Should spawn ${expectedPowerUps} power-ups`);
    runner.assert(game.enemies.length >= 2, 'Should spawn at least 2 enemies');
});

// Unit Tests - Player Movement
runner.test('Player movement updates position correctly', () => {
    const game = new Game();
    game.startGame();
    
    const initialX = game.player.x;
    const initialY = game.player.y;
    
    // Simulate key press
    game.keys['ArrowRight'] = true;
    game.updatePlayer();
    
    runner.assert(game.player.x >= initialX, 'Player should move right when right arrow is pressed');
});

// Unit Tests - Collision Detection
runner.test('Coin collection increases score', () => {
    const game = new Game();
    game.startGame();
    
    // Place coin at player position
    game.coins[0] = { x: game.player.x, y: game.player.y, collected: false };
    const initialScore = game.score;
    
    game.checkCollisions();
    
    runner.assert(game.coins[0].collected, 'Coin should be collected');
    runner.assertEqual(game.score, initialScore + 10, 'Score should increase by 10');
});

// Unit Tests - Power-up System
runner.test('Power-up activation works correctly', () => {
    const game = new Game();
    game.startGame();
    
    // Place power-up at player position
    game.powerUps[0] = { x: game.player.x, y: game.player.y, collected: false };
    const initialScore = game.score;
    
    game.checkCollisions();
    
    runner.assert(game.powerUps[0].collected, 'Power-up should be collected');
    runner.assert(game.powerUpTime > 0, 'Power-up timer should be active');
    runner.assertEqual(game.score, initialScore + 50, 'Score should increase by 50');
});

// Unit Tests - Enemy Behavior
runner.test('Enemies move and change direction', () => {
    const game = new Game();
    game.startGame();
    
    if (game.enemies.length > 0) {
        const enemy = game.enemies[0];
        const initialX = enemy.x;
        const initialY = enemy.y;
        
        // Force enemy to move
        enemy.moveTimer = 0;
        game.updateEnemies();
        
        runner.assert(
            enemy.x !== initialX || enemy.y !== initialY || enemy.direction !== undefined,
            'Enemy should move or have direction set'
        );
    }
});

// Unit Tests - Level Progression
runner.test('Level progression works when all coins collected', () => {
    const game = new Game();
    game.startGame();
    
    const initialLevel = game.level;
    
    // Mark all coins as collected
    game.coins.forEach(coin => coin.collected = true);
    
    game.update();
    
    runner.assertEqual(game.level, initialLevel + 1, 'Level should increase when all coins collected');
});

// Unit Tests - Game Over Condition
runner.test('Game over triggers when lives reach zero', () => {
    const game = new Game();
    game.startGame();
    
    game.lives = 1;
    
    // Place enemy at player position (without power-up)
    if (game.enemies.length > 0) {
        game.enemies[0].x = game.player.x;
        game.enemies[0].y = game.player.y;
        game.powerUpTime = 0;
        
        game.checkCollisions();
        
        runner.assertEqual(game.gameState, 'gameOver', 'Game should be over when lives reach zero');
    }
});

// Integration Tests - Game Flow
runner.test('Complete game flow integration', () => {
    const game = new Game();
    
    // Test initialization
    runner.assertEqual(game.gameState, 'waiting', 'Game should start in waiting state');
    
    // Start game
    game.startGame();
    runner.assertEqual(game.gameState, 'playing', 'Game should be in playing state after start');
    
    // Test that all systems are initialized
    runner.assert(game.maze.length > 0, 'Maze should be generated');
    runner.assert(game.coins.length > 0, 'Coins should be spawned');
    runner.assert(game.powerUps.length > 0, 'Power-ups should be spawned');
    runner.assert(game.enemies.length > 0, 'Enemies should be spawned');
});

// Performance Tests
runner.test('Game loop performance', () => {
    const game = new Game();
    game.startGame();
    
    const startTime = performance.now();
    
    // Run multiple update cycles
    for (let i = 0; i < 100; i++) {
        game.update();
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    runner.assert(duration < 100, `Game loop should be performant (took ${duration.toFixed(2)}ms for 100 cycles)`);
});

// E2E Simulation Tests
runner.test('E2E: Player can collect all items and advance level', () => {
    const game = new Game();
    game.startGame();
    
    const initialLevel = game.level;
    const initialScore = game.score;
    
    // Simulate collecting all coins
    game.coins.forEach(coin => {
        coin.collected = true;
        game.score += 10;
    });
    
    // Simulate collecting power-ups
    game.powerUps.forEach(powerUp => {
        powerUp.collected = true;
        game.score += 50;
    });
    
    game.update();
    
    runner.assert(game.level > initialLevel, 'Level should advance');
    runner.assert(game.score > initialScore, 'Score should increase');
});

runner.test('E2E: Enemy defeat during power-up', () => {
    const game = new Game();
    game.startGame();
    
    const initialScore = game.score;
    const initialEnemyCount = game.enemies.length;
    
    // Activate power-up
    game.powerUpTime = 300;
    
    // Place enemy at player position
    if (game.enemies.length > 0) {
        game.enemies[0].x = game.player.x;
        game.enemies[0].y = game.player.y;
        
        game.checkCollisions();
        
        runner.assert(game.enemies.length < initialEnemyCount, 'Enemy should be defeated');
        runner.assertEqual(game.score, initialScore + 100, 'Score should increase by 100');
    }
});

// Run all tests when page loads
window.addEventListener('load', () => {
    setTimeout(() => {
        runner.run();
    }, 100);
});