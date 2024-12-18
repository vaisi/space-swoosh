import { Game } from './game/Game.js';
import { GameConfig } from './config/GameConfig.js';

window.addEventListener('load', () => {
    let playerName = localStorage.getItem('playerName');
    
    if (!playerName) {
        playerName = prompt('Enter your name:', 'Anonymous');
        if (playerName) {
            localStorage.setItem('playerName', playerName);
        }
    }

    const game = new Game(GameConfig);
    game.start();
}); 