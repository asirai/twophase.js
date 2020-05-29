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

TWOPHASE.twophase = () => {

const U = 0;
const F = 1;
const R = 2;
const D = 3;
const B = 4;
const L = 5;

let moveName;
let moveObject;
let Cnk;

let twistTable;
let flipTable;
let eSliceTable;

let cPTable;
let eSliceTable2;
let mSliceTable;
let sSliceTable;

let twistPrun;
let flipPrun;
let eSlicePrun;

let cPPrun;
let mSlicePrun;
let sSlicePrun;

let initialized = false;

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

const getESlice2 = (obj) => {
  let ret = 0
  let s = 4;
  let perm = [];
  for (let i = 0; i < 12; i++) {
    if (obj.ep[i] > 7) {
      ret += Cnk[11 - i][s--];
      perm.push(obj.ep[i] - 8);
    }
  }

  let flag = 15;
  let _ret = 0;
  let tmp;
  for (let i = 0; i < 4; i++) {
    tmp = 15 >> 4 - perm[i];
    _ret += fact(3 - i) * bitCount(flag & tmp);
    flag ^= 1 << perm[i];
  }

  return ret * 24 + _ret;
}

const getMSlice = (obj) => {
  let ret = 0
  let s = 4;
  let perm = [];
  for (let i = 0; i < 12; i++) {
    if (obj.ep[i] < 4) {
      ret += Cnk[11 - i][s--];
      perm.push(obj.ep[i]);
    }
  }

  let flag = 15;
  let _ret = 0;
  let tmp;
  for (let i = 0; i < 4; i++) {
    tmp = 15 >> 4 - perm[i];
    _ret += fact(3 - i) * bitCount(flag & tmp);
    flag ^= 1 << perm[i];
  }

  return ret * 24 + _ret;
}

const getSSlice = (obj) => {
  let ret = 0
  let s = 4;
  let perm = [];
  for (let i = 0; i < 12; i++) {
    if (obj.ep[i] >= 4 && obj.ep[i] <= 7) {
      ret += Cnk[11 - i][s--];
      perm.push(obj.ep[i] - 4);
    }
  }

  let flag = 15;
  let _ret = 0;
  let tmp;
  for (let i = 0; i < 4; i++) {
    tmp = 15 >> 4 - perm[i];
    _ret += fact(3 - i) * bitCount(flag & tmp);
    flag ^= 1 << perm[i];
  }

  return ret * 24 + _ret;
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

const setTwist = (obj, idx) => {
  let tw = 0
  for (let i = 0; i < 7; i++) {
    obj.co[i] = idx / (3 ** (6 - i)) | 0;
    tw += obj.co[i];
    idx = idx % (3 ** (6 - i));
  }
  obj.co[7] = (15 - tw) % 3;
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

const setESlice2 = (obj, idx) => {
  let _idx = idx % 24;

  let arr = [8, 9, 10, 11];
  let perm = [];
  let tmp;
  for (let i = 0; i < 4; i++) {
    tmp = 1 << _idx / fact(3 - i) | 0;
    perm.push(arr.splice(bitCount(tmp - 1), 1)[0]);
    _idx = _idx % fact(3 - i);
  }

  idx = idx / 24 | 0;
  let s = 4;
  for (let i = 0; i < 12; i++) {
    if (idx >= Cnk[11 - i][s]) {
      obj.ep[i] = perm[4 - s];
      idx -= Cnk[11 - i][s--];
    } else {
      obj.ep[i] = i - 4 + s;
    }
  }
}

const setMSlice = (obj, idx) => {
  let _idx = idx % 24;

  let arr = [0, 1, 2, 3];
  let perm = [];
  let tmp;
  for (let i = 0; i < 4; i++) {
    tmp = 1 << _idx / fact(3 - i) | 0;
    perm.push(arr.splice(bitCount(tmp - 1), 1)[0]);
    _idx = _idx % fact(3 - i);
  }

  idx = idx / 24 | 0;
  let s = 4;
  for (let i = 0; i < 12; i++) {
    if (idx >= Cnk[11 - i][s]) {
      obj.ep[i] = perm[4 - s];
      idx -= Cnk[11 - i][s--];
    } else {
      obj.ep[i] = i + s;
    }
  }
}

const setSSlice = (obj, idx) => {
  let _idx = idx % 24;

  let arr = [4, 5, 6, 7];
  let perm = [];
  let tmp;
  for (let i = 0; i < 4; i++) {
    tmp = 1 << _idx / fact(3 - i) | 0;
    perm.push(arr.splice(bitCount(tmp - 1), 1)[0]);
    _idx = _idx % fact(3 - i);
  }

  idx = idx / 24 | 0;
  let s = 4;
  for (let i = 0; i < 12; i++) {
    if (idx >= Cnk[11 - i][s]) {
      obj.ep[i] = perm[4 - s];
      idx -= Cnk[11 - i][s--];
    } else {
      obj.ep[i] = [0, 1, 2, 3, 8, 9, 10, 11][i - 4 + s];
    }
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

  return p & 1 // 奇置換なら1, 偶置換なら0を返す
}

const getEdgeParity = (idx) => {
  let tmp;
  let p = 0;
  for (let i = 0; i < 12; i++) {
    tmp = 1 << idx / fact(11 - i) | 0;
    p += bitCount(tmp - 1);
    idx = idx % fact(11 - i);
  }

  return p & 1 // 奇置換なら1, 偶置換なら0を返す
}

const initTable = () => {
  initTwistTable();
  initFlipTable();
  initESliceTable();
  initCPTable();
  initESliceTable2();
  initMSliceTable();
  initSSliceTable();
}

const initTwistTable = () => {
  twistTable = create2DArray(2187, 18);
  let obj_0 = {};
  let obj_1 = {};
  $init(obj_0);
  $init(obj_1);
  for (let i = 0; i < 2187; i++) {
    setTwist(obj_0, i);
    for (let j = 0; j < 18; j++) {
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
  for (let i = 0; i < 2048; i++) {
    setFlip(obj_0, i);
    for (let j = 0; j < 18; j++) {
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
  for (let i = 0; i < 495; i++) {
    setESlice(obj_0, i);
    for (let j = 0; j < 18; j++) {
      $multiply(obj_0, moveObject[j], obj_1)
      eSliceTable[i][j] = getESlice(obj_1);
    }
  }
}

const initCPTable = () => {
  cPTable = create2DArray(40320, 18);
  let obj_0 = {};
  let obj_1 = {};
  $init(obj_0);
  $init(obj_1);
  for (let i = 0; i < 40320; i++) {
    setCP(obj_0, i);
    for (let j = 0; j < 18; j++) {
      $multiply(obj_0, moveObject[j], obj_1);
      cPTable[i][j] = getCP(obj_1);
    }
  }
}

const initESliceTable2 = () => {
  eSliceTable2 = create2DArray(11880, 18);
  let obj_0 = {};
  let obj_1 = {};
  $init(obj_0);
  $init(obj_1);
  for (let i = 0; i < 11880; i++) {
    setESlice2(obj_0, i);
    for (let j = 0; j < 18; j++) {
      $multiply(obj_0, moveObject[j], obj_1);
      eSliceTable2[i][j] = getESlice2(obj_1);
    }
  }
}

const initMSliceTable = () => {
  mSliceTable = create2DArray(11880, 18);
  let obj_0 = {};
  let obj_1 = {};
  $init(obj_0);
  $init(obj_1);
  for (let i = 0; i < 11880; i++) {
    setMSlice(obj_0, i);
    for (let j = 0; j < 18; j++) {
      $multiply(obj_0, moveObject[j], obj_1);
      mSliceTable[i][j] = getMSlice(obj_1);
    }
  }
}

const initSSliceTable = () => {
  sSliceTable = create2DArray(11880, 18);
  let obj_0 = {};
  let obj_1 = {};
  $init(obj_0);
  $init(obj_1);
  for (let i = 0; i < 11880; i++) {
    setSSlice(obj_0, i);
    for (let j = 0; j < 18; j++) {
      $multiply(obj_0, moveObject[j], obj_1);
      sSliceTable[i][j] = getSSlice(obj_1);
    }
  }
}

const initPrun = () => {
  initTwistPrun();
  initFlipPrun();
  initESlicePrun();
  initCPPrun();
  initMSlicePrun();
  initSSlicePrun();
}

const initTwistPrun = () => {
  twistPrun = Array(2187);

  let visited = Array(2187);
  visited.fill(0);
  let cur;
  let queue = new Queue();
  let children;
  let done = 0;

  queue.push([0, 0]);
  visited[0] = 1;
  while (done < 2187) {
    cur = queue.pop();
    twistPrun[cur[0]] = cur[1];
    done++;
    children = twistTable[cur[0]];
    for (let i = 0; i < 18; i++) {
      if (visited[children[i]] === 0) {
        visited[children[i]] = 1;
        queue.push([children[i], cur[1] + 1]);
      }
    }
  }
}

const initFlipPrun = () => {
  flipPrun = Array(2048);

  let visited = Array(2048);
  visited.fill(0);
  let cur;
  let queue = new Queue();
  let children;
  let done = 0;

  queue.push([0, 0]);
  visited[0] = 1;
  while (done < 2048) {
    cur = queue.pop();
    flipPrun[cur[0]] = cur[1];
    done++;
    children = flipTable[cur[0]];
    for (let i = 0; i < 18; i++) {
      if (visited[children[i]] === 0) {
        visited[children[i]] = 1;
        queue.push([children[i], cur[1] + 1]);
      }
    }
  }
}

const initESlicePrun = () => {
  eSlicePrun = Array(495);

  let visited = Array(495);
  visited.fill(0);
  let cur;
  let queue = new Queue();
  let children;
  let done = 0;

  queue.push([0, 0]);
  visited[0] = 1;
  while (done < 495) {
    cur = queue.pop();
    eSlicePrun[cur[0]] = cur[1];
    done++;
    children = eSliceTable[cur[0]];
    for (let i = 0; i < 18; i++) {
      if (visited[children[i]] === 0) {
        visited[children[i]] = 1;
        queue.push([children[i], cur[1] + 1]);
      }
    }
  }
}

const initCPPrun = () => {
  let arr = [0, 1, 2, 4, 7, 9, 10, 11, 13, 16];
  cPPrun = Array(40320);

  let visited = Array(40320);
  visited.fill(0);
  let cur;
  let queue = new Queue();
  let children;
  let done = 0;

  queue.push([0, 0]);
  visited[0] = 1;
  while (done < 40320) {
    cur = queue.pop();
    cPPrun[cur[0]] = cur[1];
    done++;
    children = cPTable[cur[0]];
    for (let i = 0; i < 10; i++) {
      if (visited[children[arr[i]]] === 0) {
        visited[children[arr[i]]] = 1;
        queue.push([children[arr[i]], cur[1] + 1]);
      }
    }
  }
}

const initMSlicePrun = () => {
  let arr = [0, 1, 2, 4, 7, 9, 10, 11, 13, 16];
  mSlicePrun = Array(11880);

  let visited = Array(11880);
  visited.fill(0);
  let cur;
  let queue = new Queue();
  let children;

  queue.push([11856, 0]);
  visited[11856] = 1;
  while (queue.size() > 0) {
    cur = queue.pop();
    mSlicePrun[cur[0]] = cur[1];
    children = mSliceTable[cur[0]];
    for (let i = 0; i < 10; i++) {
      if (visited[children[arr[i]]] === 0) {
        visited[children[arr[i]]] = 1;
        queue.push([children[arr[i]], cur[1] + 1]);
      }
    }
  }
}

const initSSlicePrun = () => {
  let arr = [0, 1, 2, 4, 7, 9, 10, 11, 13, 16];
  sSlicePrun = Array(11880);

  let visited = Array(11880);
  visited.fill(0);
  let cur;
  let queue = new Queue();
  let children;

  queue.push([1656, 0]);
  visited[1656] = 1;
  while (queue.size() > 0) {
    cur = queue.pop();
    sSlicePrun[cur[0]] = cur[1];
    children = sSliceTable[cur[0]];
    for (let i = 0; i < 10; i++) {
      if (visited[children[arr[i]]] === 0) {
        visited[children[arr[i]]] = 1;
        queue.push([children[arr[i]], cur[1] + 1]);
      }
    }
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

  let stack = new Stack(); // obj = [twist, flip, eslice, mv]
  stack.push([
    getTwist(root),
    getFlip(root),
    getESlice(root),
    []
  ]);
  let cur;
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

    if (cur[3].length + Math.max(twistPrun[cur[0]], flipPrun[cur[1]], eSlicePrun[cur[2]]) > depth) {
      continue;
    }

    expanded++;

    for (let i = 0; i < 18; i++) {
      let face = i / 3 | 0;
      let curFace = cur[3].length === 0 ? -1 : cur[3][cur[3].length - 1] / 3 | 0;
      if (face !== curFace || face > curFace) {
        let mv = cur[3].slice();
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

  let stack = new Stack(); // obj = [cp, eslice, mslice, sslice, mv]
  stack.push([
    getCP(root),
    getESlice2(root),
    getMSlice(root),
    getSSlice(root),
    []
  ]);
  let cur;
  while(stack.size() > 0) {
    evaluated++; // evaluate
    cur = stack.pop();
    if(cur[0] === 0 && cur[1] === 0 && cur[2] === 11856 && cur[3] === 1656) {
      endTime = Date.now();
      console.log(
        'depth=' + depth + ' [expanded: ' + expanded + ', evaluated: ' + evaluated + ', ' + (endTime - startTime) + ' ms]'
      );
      return cur[4];
    }

    if (cur[4].length + Math.max(cPPrun[cur[0]], mSlicePrun[cur[2]], sSlicePrun[cur[3]]) > depth) {
      continue;
    }

    expanded++; // expand

    for (let i = 0; i < 10; i++) {
      let _i = [0, 1, 2, 4, 7, 9, 10, 11, 13, 16][i];
      let face = _i / 3 | 0;
      let curFace = cur[4].length === 0 ? -1 : cur[4][cur[4].length - 1] / 3 | 0;
      if (face !== curFace || face > curFace) {
        let mv = cur[4].slice();
        mv.push(_i);
        stack.push([
          cPTable[cur[0]][_i],
          eSliceTable2[cur[1]][_i],
          mSliceTable[cur[2]][_i],
          sSliceTable[cur[3]][_i],
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
  let l = moves.length;
  let faceList = Array(l);
  let axisList = Array(l);
  let suffixList = Array(l);
  for (let i = 0; i < l; i++) {
    faceList[i] = moves[i] / 3 | 0;
    axisList[i] = faceList[i] % 3;
    suffixList[i] = moves[i] % 3
  }
  let newFaceList;
  let newAxisList;
  let newSuffixList;

  let cancelled;

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

  // let ret = '';
  // for (let i = 0; i < faceList.length; i++) {
  //   ret += moveName[faceList[i] * 3 + suffixList[i]];
  // }

  // return ret;
  let ret = Array(faceList.length);
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

  moveName = ["U", "U2", "U'", "F", "F2", "F'", "R", "R2", "R'", "D", "D2", "D'", "B", "B2", "B'", "L", "L2", "L'"];
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
    ret[i].fill(-1);
  }
  return ret;
}

class Random {
  constructor(seed) {
    this.x = 123456789;
    this.y = 362436069;
    this.z = 521288629;
    this.w = seed ? seed : Math.floor(Math.random() * 88675123);
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

class Queue {
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
    this.heap.push(item);
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

}

const tp = TWOPHASE.twophase();
tp.initialize()

tp.solve("D2 R U2 B' D' F U2 L' U R2 B D2 F B2 D2 L2 B'") // solution: 
tp.getScramble(347)