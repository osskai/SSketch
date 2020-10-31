import {ModuleTree} from 'vuex'

const files: any = require.context('.', false, /\.ts$/);

let modules: ModuleTree<any> = {};

files.keys().forEach((key: string) => {
    if (key === './index.ts') {
        return
    }
    modules[key.replace(/(\.\/|\.ts)/g, '')] = files(key).default
});

export default modules;

