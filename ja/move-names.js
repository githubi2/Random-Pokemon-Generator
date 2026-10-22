/* 把 moves-data.js 里的英文招式名换成日文（显示用） */
(function apply(){var M=window.JA_MOVE_NAMES,D=window.POKEMON_MOVES;if(!M||!D){document.addEventListener('DOMContentLoaded',apply);return;}for(var k in D){if(M[k])D[k].n=M[k];}})();
