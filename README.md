twophase.js
========

#### JavaScript 3x3x3 Solver/Scrambler ####

### Usage ###

Call `TWOPHASE.twophase.initialize()` before use.
```javascript
const tp = TWOPHASE.twophase;
tp.initialize();
```
`TWOPHASE.twophase.solve(scramble)` returns solution for scramble.
```javascript
tp.solve("D2 R U2 B' D' F U2 L' U R2 B D2 F B2 D2 L2 B'"); // solution: F D' R' B' U' F' B2 U' L D' F2 U' R2 F2 D' R2 B2 D' R2 D L2 D2
```
`TWOPHASE.twophase.getScramble(seed)` returns a scramble. You can get the same scramble by the same seed. if no seed is entered, returns a random scramble.
```javascript
tp.getScramble(347); // U R2 U' R2 D L2 D' F2 U2 B2 F2 L2 D' R' B L2 D' L2 U R' F D' L2
```