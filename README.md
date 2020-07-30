twophase.js
========

#### JavaScript 3x3x3 Solver/Scrambler ####

### Usage ###

Call `TWOPHASE.twophase.initialize()` before use. This takes about 1 second on a modern computer.
```javascript
const tp = TWOPHASE.twophase;
tp.initialize();
```
`TWOPHASE.twophase.solve(scramble, max)` returns solution for scramble. The argument max sets the maximum number of moves. The default value is 22.
```javascript
tp.solve("D2 R U2 B' D' F U2 L' U R2 B D2 F B2 D2 L2 B'"); // solution: F D' R' B' U' F' B2 U' L D' F2 U' R2 F2 D' R2 B2 D' R2 D L2 D2
```
`TWOPHASE.twophase.getScramble(seed, max)` returns a scramble. You can get the same scramble by the same seed. if no seed is entered, returns a random scramble. The argument max sets the maximum number of moves. The default value is 22.
```javascript
tp.getScramble(347); // D R2 U R2 U2 R2 U L2 R2 D2 F2 L2 B L F' D U R U2 R' U B'
```