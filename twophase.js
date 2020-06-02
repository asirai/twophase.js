/*
twophase.js

numbering
             +------------+
             | 02  01  03 |
             |            |
             | 05  fU  04 |
             |            |
             | 01  00  00 |
+------------+------------+------------+------------+
| 02  05  01 | 01  00  00 | 00  04  03 | 03  01  02 |
|            |            |            |            |
| 10  fL  09 | 09  fF  08 | 08  fR  11 | 11  fB  10 |
|            |            |            |            |
| 06  06  07 | 07  03  04 | 04  07  05 | 05  02  06 |
+------------+------------+------------+------------+
             | 07  03  04 |
             |            |
             | 06  fD  07 |
             |            |
             | 06  02  05 |
             +------------+             
*/

let TWOPHASE = {};

TWOPHASE.twophase = (() => {

const U = 0;
const F = 1;
const R = 2;
const D = 3;
const B = 4;
const L = 5;

let moveName;
let moveObject;
let restrictedMove;
let Cnk;

let twistTable;
let flipTable;
let eSliceTable;
let cPTable;
let UDEPTable;
let eSliceTable2;

let twistESlicePrun;
let flipESlicePrun;
let cPESlicePrun;
let UDEPESlicePrun;

let initialized = false;

const getTwist = (obj) => {
  ret = 0;
  for (let i = 0; i < 7; i++) {
    ret *= 3;
    ret += obj.co[i]
  }
  return ret;
}

const getFlip = (obj) => {
  ret = 0;
  for (let i = 0; i < 11; i++) {
    ret *= 2;
    ret += obj.eo[i]
  }
  return ret;
}

const getESlice = (obj) => {
  let ret = 0
  let s = 4;
  for (let i = 0; i < 12; i++) {
    if (obj.ep[i] > 7) {
      ret += Cnk[11 - i][s--];
    }
  }
  return ret;
}

const getCP = (obj) => {
  let flag = 255;
  let ret = 0;
  let tmp;
  for (let i = 0; i < 8; i++) {
    tmp = 255 >> 8 - obj.cp[i];
    ret += fact(7 - i) * bitCount(flag & tmp);
    flag ^= 1 << obj.cp[i];
  }
  return ret;
}

const getUDEP = (obj) => {
  let flag = 255;
  let ret = 0;
  let tmp;
  for (let i = 0; i < 8; i++) {
    tmp = 255 >> 8 - obj.ep[i];
    ret += fact(7 - i) * bitCount(flag & tmp);
    flag ^= 1 << obj.ep[i];
  }
  return ret;
}

const getESlice2 = (obj) => {
  let ret = 0
  let flag = 15;
  let tmp;
  let cur;
  for (let i = 0; i < 4; i++) {
    cur = obj.ep[i + 8] - 8;

    tmp = 15 >> 4 - cur;
    ret += fact(3 - i) * bitCount(flag & tmp);
    flag ^= 1 << cur;
  }
  return ret;
}

const setTwist = (obj, idx) => {
  let tw = 0
  for (let i = 0; i < 7; i++) {
    obj.co[i] = idx / (3 ** (6 - i)) | 0;
    tw += obj.co[i];
    idx = idx % (3 ** (6 - i));
  }
  obj.co[7] = (15 - tw) % 3;
}

const setFlip = (obj, idx) => {
  let fl = 0;
  for (let i = 0; i < 11; i++) {
    obj.eo[10 - i] = idx & 1;
    fl += obj.eo[10 - i];
    idx = idx >>> 1;
  }
  obj.eo[11] = (12 - fl) % 2
}

const setESlice = (obj, idx) => {
  let s = 4;
  for (let i = 0; i < 12; i++) {
    if (idx >= Cnk[11 - i][s]) {
      obj.ep[i] = s + 7;
      idx -= Cnk[11 - i][s--];
    } else {
      obj.ep[i] = i - 4 + s;
    }
  }
}

const setCP = (obj, idx) => {
  let arr = [0, 1, 2, 3, 4, 5, 6, 7];
  let tmp;
  for (let i = 0; i < 8; i++) {
    tmp = 1 << idx / fact(7 - i) | 0;
    obj.cp[i] = arr.splice(bitCount(tmp - 1), 1)[0];
    idx = idx % fact(7 - i);
  }
}

const setUDEP = (obj, idx) => {
  let arr = [0, 1, 2, 3, 4, 5, 6, 7];
  let tmp;
  for (let i = 0; i < 8; i++) {
    tmp = 1 << idx / fact(7 - i) | 0;
    obj.ep[i] = arr.splice(bitCount(tmp - 1), 1)[0];
    idx = idx % fact(7 - i);
  }
}

const setESlice2 = (obj, idx) => {
  let arr = [8, 9, 10, 11];
  let tmp;
  for (let i = 0; i < 4; i++) {
    tmp = 1 << idx / fact(3 - i) | 0;
    obj.ep[i + 8] = arr.splice(bitCount(tmp - 1), 1)[0];
    idx = idx % fact(3 - i);
  }
}

const setEP = (obj, idx) => {
  let arr = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  let tmp;
  for (let i = 0; i < 12; i++) {
    tmp = 1 << idx / fact(11 - i) | 0;
    obj.ep[i] = arr.splice(bitCount(tmp - 1), 1)[0];
    idx = idx % fact(11 - i);
  }
}

const getCornerParity = (idx) => {
  let tmp;
  let p = 0;
  for (let i = 0; i < 8; i++) {
    tmp = 1 << idx / fact(7 - i) | 0;
    p += bitCount(tmp - 1);
    idx = idx % fact(7 - i);
  }
  return p & 1;
}

const getEdgeParity = (idx) => {
  let tmp;
  let p = 0;
  for (let i = 0; i < 12; i++) {
    tmp = 1 << idx / fact(11 - i) | 0;
    p += bitCount(tmp - 1);
    idx = idx % fact(11 - i);
  }
  return p & 1;
}

const initTable = () => {
  initTwistTable();
  initFlipTable();
  initESliceTable();
  initCPTable();
  initUDEPTable();
  initESliceTable2();
}

const initTwistTable = () => {
  twistTable = create2DArray(2187, 18);
  let obj_0 = {};
  let obj_1 = {};
  $init(obj_0);
  $init(obj_1);
  let i, j;
  for (i = 0; i < 2187; i++) {
    setTwist(obj_0, i);
    for (j = 0; j < 18; j++) {
      $multiply(obj_0, moveObject[j], obj_1)
      twistTable[i][j] = getTwist(obj_1);
    }
  }
}

const initFlipTable = () => {
  flipTable = create2DArray(2048, 18);
  let obj_0 = {};
  let obj_1 = {};
  $init(obj_0);
  $init(obj_1);
  let i, j;
  for (i = 0; i < 2048; i++) {
    setFlip(obj_0, i);
    for (j = 0; j < 18; j++) {
      $multiply(obj_0, moveObject[j], obj_1)
      flipTable[i][j] = getFlip(obj_1);
    }
  }
}

const initESliceTable = () => {
  eSliceTable = create2DArray(495, 18);
  let obj_0 = {};
  let obj_1 = {};
  $init(obj_0);
  $init(obj_1);
  let i, j;
  for (i = 0; i < 495; i++) {
    setESlice(obj_0, i);
    for (j = 0; j < 18; j++) {
      $multiply(obj_0, moveObject[j], obj_1)
      eSliceTable[i][j] = getESlice(obj_1);
    }
  }
}

const initCPTable = () => {
  cPTable = create2DArray(40320, 10);
  let obj_0 = {};
  let obj_1 = {};
  $init(obj_0);
  $init(obj_1);
  let i, j;
  for (i = 0; i < 40320; i++) {
    setCP(obj_0, i);
    for (j = 0; j < 10; j++) {
      $multiply(obj_0, moveObject[restrictedMove[j]], obj_1);
      cPTable[i][j] = getCP(obj_1);
    }
  }
}

const initUDEPTable = () => {
  UDEPTable = create2DArray(40320, 10);
  let obj_0 = {};
  let obj_1 = {};
  $init(obj_0);
  $init(obj_1);
  let i, j;
  for (i = 0; i < 40320; i++) {
    setUDEP(obj_0, i);
    for (j = 0; j < 10; j++) {
      $multiply(obj_0, moveObject[restrictedMove[j]], obj_1);
      UDEPTable[i][j] = getUDEP(obj_1);
    }
  }
}

const initESliceTable2 = () => {
  eSliceTable2 = create2DArray(24, 10);
  let obj_0 = {};
  let obj_1 = {};
  $init(obj_0);
  $init(obj_1);
  let i, j;
  for (i = 0; i < 24; i++) {
    setESlice2(obj_0, i);
    for (j = 0; j < 10; j++) {
      $multiply(obj_0, moveObject[restrictedMove[j]], obj_1);
      eSliceTable2[i][j] = getESlice2(obj_1);
    }
  }
}

const initPrun = () => {
  initTwistESlicePrun();
  initFlipESlicePrun();
  initCPESlicePrun();
  initUDEPESlicePrun();
}

const initTwistESlicePrun = () => {
  twistESlicePrun = Array(1082565);
  twistESlicePrun.fill(15);

  let children1, children2, done, depth, i, j;

  twistESlicePrun[0] = 0;
  done = 1;
  depth = 0;
  while (done < 1082565) {
    for (i = 0; i < 1082565; i++) {
      if (twistESlicePrun[i] !== depth) {
        continue;
      }
      
      children1 = twistTable[i / 495 | 0];
      children2 = eSliceTable[i % 495];
      for (j = 0; j < 18; j++) {
        if (twistESlicePrun[children1[j] * 495 + children2[j]] === 15) {
          twistESlicePrun[children1[j] * 495 + children2[j]] = depth + 1;
          done++
        }
      }
    }
    depth++;
  }
}

const initFlipESlicePrun = () => {
  flipESlicePrun = Array(1013760);
  flipESlicePrun.fill(15);

  let children1, children2, done, depth, i, j;

  flipESlicePrun[0] = 0;
  done = 1;
  depth = 0;
  while (done < 1013760) {
    for (i = 0; i < 1013760; i++) {
      if (flipESlicePrun[i] !== depth) {
        continue;
      }
      
      children1 = flipTable[i / 495 | 0];
      children2 = eSliceTable[i % 495];
      for (j = 0; j < 18; j++) {
        if (flipESlicePrun[children1[j] * 495 + children2[j]] === 15) {
          flipESlicePrun[children1[j] * 495 + children2[j]] = depth + 1;
          done++
        }
      }
    }
    depth++;
  }
}

const initCPESlicePrun = () => {
  cPESlicePrun = Array(967680);
  cPESlicePrun.fill(15);

  let children1, children2, done, depth, i, j;

  cPESlicePrun[0] = 0;
  done = 1;
  depth = 0;
  while (done < 967680) {
    for (i = 0; i < 967680; i++) {
      if (cPESlicePrun[i] !== depth) {
        continue;
      }
      
      children1 = cPTable[i / 24 | 0];
      children2 = eSliceTable2[i % 24];
      for (j = 0; j < 10; j++) {
        if (cPESlicePrun[children1[j] * 24 + children2[j]] === 15) {
          cPESlicePrun[children1[j] * 24 + children2[j]] = depth + 1;
          done++
        }
      }
    }
    depth++;
  }
}

const initUDEPESlicePrun = () => {
  UDEPESlicePrun = Array(967680);
  UDEPESlicePrun.fill(15);

  let children1, children2, done, depth, i, j;

  UDEPESlicePrun[0] = 0;
  done = 1;
  depth = 0;
  while (done < 967680) {
    for (i = 0; i < 967680; i++) {
      if (UDEPESlicePrun[i] !== depth) {
        continue;
      }
      
      children1 = UDEPTable[i / 24 | 0];
      children2 = eSliceTable2[i % 24];
      for (j = 0; j < 10; j++) {
        if (UDEPESlicePrun[children1[j] * 24 + children2[j]] === 15) {
          UDEPESlicePrun[children1[j] * 24 + children2[j]] = depth + 1;
          done++
        }
      }
    }
    depth++;
  }
}

const search = (root) => {
  let solution1 = null;
  let solution2 = null;
  let start, end;

  console.log('[phase1]')
  start = Date.now();
  for (let d = 0; d <= 13; d++) {
    solution1 = searchPhase1(root, d);
    if (solution1 !== null) break;
  }

  for (let i = 0; i < solution1.length; i++) {
    $apply(root, moveObject[solution1[i]]);
  }

  console.log('[phase2]')
  for (let d = 0; d <= 18; d++) {
    solution2 = searchPhase2(root, d);
    if (solution2 !== null) {
      end = Date.now();
      console.log((end - start) + 'ms')
      return solution1.concat(solution2);
    }
  }
}

const searchPhase1 = (root, depth) => {
  let evaluated = 0;
  let expanded = 0;

  let startTime;
  let endTime;
  startTime = Date.now();

  let stack = new Stack(); // obj = [Twist, Flip, ESlice, mv]
  stack.push([
    getTwist(root),
    getFlip(root),
    getESlice(root),
    []
  ]);
  let cur, i, face, curFace, mv;
  while(stack.size() > 0) {
    evaluated++;
    cur = stack.pop();

    if(cur[0] === 0 && cur[1] === 0 && cur[2] === 0) {
      endTime = Date.now();
      console.log(
        'depth=' + depth + ' [expanded: ' + expanded + ', evaluated: ' + evaluated + ', ' + (endTime - startTime) + ' ms]'
      );
      return cur[3];
    }

    if (cur[3].length + Math.max(twistESlicePrun[cur[0] * 495 + cur[2]], flipESlicePrun[cur[1] * 495 + cur[2]]) > depth) {
      continue;
    }

    expanded++;

    for (i = 0; i < 18; i++) {
      face = i / 3 | 0;
      curFace = cur[3].length === 0 ? -1 : cur[3][cur[3].length - 1] / 3 | 0;
      if (face !== curFace || face > curFace) {
        mv = cur[3].slice();
        mv.push(i)
        stack.push([
          twistTable[cur[0]][i],
          flipTable[cur[1]][i],
          eSliceTable[cur[2]][i],
          mv
        ]);
      }
    }
  }
  endTime = Date.now();
  console.log(
    'depth=' + depth + ' [expanded: ' + expanded + ', evaluated: ' + evaluated + ', ' + (endTime - startTime) + ' ms]'
  );
  return null;
}

const searchPhase2 = (root, depth) => {
  let evaluated = 0;
  let expanded = 0;

  let startTime;
  let endTime;
  startTime = Date.now();

  let stack = new Stack(); // obj = [CP, UDEP ESlice, mv]
  stack.push([
    getCP(root),
    getUDEP(root),
    getESlice2(root),
    []
  ]);
  let cur, i, _i, face, curFace, mv;
  while(stack.size() > 0) {
    evaluated++; // evaluate
    cur = stack.pop();
    if(cur[0] === 0 && cur[1] === 0 && cur[2] === 0) {
      endTime = Date.now();
      console.log(
        'depth=' + depth + ' [expanded: ' + expanded + ', evaluated: ' + evaluated + ', ' + (endTime - startTime) + ' ms]'
      );
      return cur[3];
    }

    if (cur[3].length + Math.max(cPESlicePrun[cur[0] * 24 + cur[2]], UDEPESlicePrun[cur[1] * 24 + cur[2]]) > depth) {
      continue;
    }

    expanded++; // expand

    for (i = 0; i < 10; i++) {
      _i = restrictedMove[i];
      face = _i / 3 | 0;
      curFace = cur[3].length === 0 ? -1 : cur[3][cur[3].length - 1] / 3 | 0;
      if (face !== curFace || face > curFace) {
        mv = cur[3].slice();
        mv.push(_i);
        stack.push([
          cPTable[cur[0]][i],
          UDEPTable[cur[1]][i],
          eSliceTable2[cur[2]][i],
          mv
        ]);
      }
    }
  }
  endTime = Date.now();
  console.log(
    'depth=' + depth + ' [expanded: ' + expanded + ', evaluated: ' + evaluated + ', ' + (endTime - startTime) + ' ms]'
  );
  return null;
}

const getRandomState = (seed) => {
  let cp, co, ep, eo;
  let random = new Random(seed);
  let obj = {};
  do {
    cp = random.randomInt(40320);
    ep = random.randomInt(479001600);
  } while (getCornerParity(cp) !== getEdgeParity(ep))
  co = random.randomInt(2187);
  eo = random.randomInt(2048);

  $init(obj);
  setCP(obj, cp);
  setTwist(obj, co);
  setEP(obj, ep);
  setFlip(obj, eo)
  
  return obj;
}

const cancelMoves = (moves) => {
  let l, faceList, axisList, suffixList, newFaceList, newAxisList, newSuffixList, cancelled, ret;
  l = moves.length;
  faceList = Array(l);
  axisList = Array(l);
  suffixList = Array(l);
  for (let i = 0; i < l; i++) {
    faceList[i] = moves[i] / 3 | 0;
    axisList[i] = faceList[i] % 3;
    suffixList[i] = moves[i] % 3
  }
  
  do {
    cancelled = 0;
    l = faceList.length;

    for (let i = 0; i < l - 1; i++) {
      if (axisList[i] === axisList[i + 1] && faceList[i] > faceList[i + 1]) {
        swapElement(faceList, i);
        swapElement(axisList, i);
        swapElement(suffixList, i);
      }
    }

    for (let i = 0; i < l - 1; i++) {
      if (faceList[i] === faceList[i + 1]) {
        cancelled++;
        suffixList[i] = (suffixList[i] + suffixList[i + 1] + 1) % 4;
        suffixList[i + 1] = 3;
      }
    }

    newFaceList = [];
    newAxisList = [];
    newSuffixList = [];

    for (let i = 0; i < l; i++) {
      if (suffixList[i] !== 3) {
        newFaceList.push(faceList[i]);
        newAxisList.push(axisList[i]);
        newSuffixList.push(suffixList[i]);
      }
    }

    faceList = newFaceList.slice();
    axisList = newAxisList.slice();
    suffixList = newSuffixList.slice();
  } while (cancelled > 0)

  ret = Array(faceList.length);
  for (let i = 0; i < faceList.length; i++) {
    ret[i] = faceList[i] * 3 + suffixList[i];
  }
  return ret;
}

const swapElement = (arr, idx) => {
  arr.splice(idx, 2, arr[idx + 1], arr[idx]);
}

const initUtil = () => {
  Cnk = create2DArray(12, 12);
  for (let i = 0; i < 12; i++) {
    Cnk[i].fill(0);
    Cnk[i][0] = 1;
    Cnk[i][i] = 1;
    for (j = 1; j < i; j++) {
      Cnk[i][j] = Cnk[i - 1][j - 1] + Cnk[i - 1][j];
    }
  }

  moveName = ["U", "U2", "U'", "F", "F2", "F'", "R", "R2", "R'", "D", "D2", "D'", "B", "B2", "B'", "L", "L2", "L'"];

  moveObject = Array(18);
  moveObject[U * 3] = {
    'cp': [3, 0, 1, 2, 4, 5, 6, 7],
    'co': [0, 0, 0, 0, 0, 0, 0, 0],
    'ep': [4, 5, 2, 3, 1, 0, 6, 7, 8, 9, 10, 11],
    'eo': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  }
  moveObject[F * 3] = {
    'cp': [1, 7, 2, 3, 0, 5, 6, 4],
    'co': [1, 2, 0, 0, 2, 0, 0, 1],
    'ep': [9, 1, 2, 8, 4, 5, 6, 7, 0, 3, 10, 11],
    'eo': [1, 0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 0]
  };
  moveObject[R * 3] = {
    'cp': [4, 1, 2, 0, 5, 3, 6, 7],
    'co': [2, 0, 0, 1, 1, 2, 0, 0],
    'ep': [0, 1, 2, 3, 8, 5, 6, 11, 7, 9, 10, 4],
    'eo': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  };
  moveObject[D * 3] = {
    'cp': [0, 1, 2, 3, 7, 4, 5, 6],
    'co': [0, 0, 0, 0, 0, 0, 0, 0],
    'ep': [0, 1, 7, 6, 4, 5, 2, 3, 8, 9, 10, 11],
    'eo': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  };
  moveObject[B * 3] = {
    'cp': [0, 1, 3, 5, 4, 6, 2, 7],
    'co': [0, 0, 1, 2, 0, 1, 2, 0],
    'ep': [0, 11, 10, 3, 4, 5, 6, 7, 8, 9, 1, 2],
    'eo': [0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1]
  };
  moveObject[L * 3] = {
    'cp': [0, 2, 6, 3, 4, 5, 7, 1],
    'co': [0, 1, 2, 0, 0, 0, 1, 2],
    'ep': [0, 1, 2, 3, 4, 10, 9, 7, 8, 5, 6, 11],
    'eo': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  };
  for (let i = 0; i < 6; i++) {
    moveObject[i * 3 + 1] = {};
    $multiply(moveObject[i * 3], moveObject[i * 3], moveObject[i * 3 + 1]);
    moveObject[i * 3 + 2] = {};
    $multiply(moveObject[i * 3 + 1], moveObject[i * 3], moveObject[i * 3 + 2]);
  }

  restrictedMove = [0, 1, 2, 4, 7, 9, 10, 11, 13, 16];
}

const $init = (obj) => {
  obj.cp = [0, 1, 2, 3, 4, 5, 6, 7];
  obj.co = [0, 0, 0, 0, 0, 0, 0, 0];
  obj.ep = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  obj.eo = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
}

const $apply = (obj, mv) => {
  const newCp = obj.cp.map((cur, idx) => obj.cp[mv.cp[idx]]);
  const newCo = obj.co.map((cur, idx) => (obj.co[mv.cp[idx]] + mv.co[idx]) % 3);
  const newEp = obj.ep.map((cur, idx) => obj.ep[mv.ep[idx]]);
  const newEo = obj.eo.map((cur, idx) => (obj.eo[mv.ep[idx]] + mv.eo[idx]) % 2);
  obj.cp = newCp;
  obj.co = newCo;
  obj.ep = newEp;
  obj.eo = newEo;
}

const $multiply = (obj, mv, ret) => {
  const newCp = obj.cp.map((cur, idx) => obj.cp[mv.cp[idx]]);
  const newCo = obj.co.map((cur, idx) => (obj.co[mv.cp[idx]] + mv.co[idx]) % 3);
  const newEp = obj.ep.map((cur, idx) => obj.ep[mv.ep[idx]]);
  const newEo = obj.eo.map((cur, idx) => (obj.eo[mv.ep[idx]] + mv.eo[idx]) % 2);
  ret.cp = newCp;
  ret.co = newCo;
  ret.ep = newEp;
  ret.eo = newEo;
}

const bitCount = (bits) =>{
  bits = (bits & 0x55555555) + (bits >> 1 & 0x55555555);
  bits = (bits & 0x33333333) + (bits >> 2 & 0x33333333);
  bits = (bits & 0x0f0f0f0f) + (bits >> 4 & 0x0f0f0f0f);
  bits = (bits & 0x00ff00ff) + (bits >> 8 & 0x00ff00ff);
  return (bits & 0x0000ffff) + (bits >>16 & 0x0000ffff);
}

const fact = (n) => {
  let fact = 1;
  for (let i = 1; i <= n; i++) {
    fact *= i;
  }
  return fact;
}

const create2DArray = (l1, l2) => {
  let ret = Array(l1);
  for (let i = 0; i < l1; i++){
    ret[i] = Array(l2);
  }
  return ret;
}

class Random {
  constructor(seed) {
    this.x = 123456789;
    this.y = 362436069;
    this.z = 521288629;
    this.w = seed ? seed : Math.floor(Math.random() * Date.now());
  }
  
  _random() {
    let t;
 
    t = this.x ^ (this.x << 11);
    this.x = this.y; this.y = this.z; this.z = this.w;
    return this.w = (this.w ^ (this.w >>> 19)) ^ (t ^ (t >>> 8)); 
  }
  
  randomInt(n) {
    const r = Math.abs(this._random());
    return (r % n);
  }
}

class Stack {
  constructor() {
    this.heap = [];
  }

  empty() {
    if (this.heap.length === 0) return true;
    return false;
  }

  size() {
    return this.heap.length;
  }

  top() {
    return this.heap[0];
  }
 
  push(item) {
    this.heap.unshift(item);
  }
  
  pop() {
    return this.heap.shift();
  }
}

const initialize = () => {
  if (!initialized) {
    let start;
    let end;
    start = Date.now();
    console.log('Initializing...')
    initUtil();
    initTable();
    initPrun();
    initialized = true;
    end = Date.now();
    console.log((end - start) + ' ms')
  }
}

const solve = (scramble) => {
  console.log('scramble: ' + scramble);
  let arr = scramble.split(' ');
  let obj = {}
  $init(obj);
  let _solution;
  let solution = '';

  for (let i = 0; i < arr.length; i++) {
    $apply(obj, moveObject[moveName.indexOf(arr[i])]);
  }

  _solution = search(obj);
  _solution = cancelMoves(_solution);
  _solution.forEach((val) => {
    solution += moveName[val] + ' '
  })
  console.log('solution: ' + solution);
  return solution;
}

const getScramble = (seed) => {
  let scramble, scr, solution, ret;

  scramble = '';
  scr = getRandomState(seed);
  solution = search(scr);
  solution = cancelMoves(solution);
  solution.reverse();
  ret = '';
  solution.forEach((val) => {
    ret += moveName[val] + ' '
  })
  console.log(ret)
  return ret;
}

return {
  initialize: initialize,
  solve: solve,
  getScramble: getScramble
}

})();

const tp = TWOPHASE.twophase;
tp.initialize()
tp.solve("D2 R' B2 U2 L' F2 L2 F2 L' D2 L2 U B F D' U' B U' L2 R'")