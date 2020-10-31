const files: any = require.context('.', false, /\.ts/);

let configRouters: Array<any> = [];

files.keys().forEach((key: string) => {
    if (key === './index.ts') {
        return
    }
    configRouters = configRouters.concat(files(key).default)
});

export default configRouters;
