export function deepCopyArray(objs: Array<any>) {
    const newObj = new Array(objs.length);
    for (let i = 0; i < objs.length; ++i) {
        if (objs[i] instanceof Array) {
            newObj[i] = deepCopyArray(objs[i]);
        } else {
            newObj[i] = objs[i];
        }
    }
    return newObj;
}
