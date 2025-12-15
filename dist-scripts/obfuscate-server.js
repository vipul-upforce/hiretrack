
const __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// scripts/obfuscate-server.ts
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const javascript_obfuscator_1 = __importDefault(require("javascript-obfuscator"));

const root = path_1.default.resolve(__dirname, '..');
const nextServerDirs = [
    path_1.default.join(root, '.next', 'server'),
    path_1.default.join(root, '.next', 'serverless')
];
const obfuscationOptions = {
    compact: true,
    controlFlowFlattening: false,
    stringArray: true,
    stringArrayThreshold: 0.75,
    rotateStringArray: true,
    disableConsoleOutput: true,
};
function walk(dir, cb) {
    if (!fs_1.default.existsSync(dir))
        return;
    for (const d of fs_1.default.readdirSync(dir, { withFileTypes: true })) {
        const full = path_1.default.join(dir, d.name);
        if (d.isDirectory())
            walk(full, cb);
        else
            cb(full);
    }
}
function shouldSkip(file) {
    const skipPatterns = ['.map', '.json', '.wasm', 'react-refresh', 'trace', 'trace-entry'];
    return skipPatterns.some((s) => file.includes(s)) || !file.endsWith('.js');
}
function obfuscateFile(file) {
    try {
        const code = fs_1.default.readFileSync(file, 'utf8');
        const obfuscated = javascript_obfuscator_1.default.obfuscate(code, obfuscationOptions);
        fs_1.default.writeFileSync(file, obfuscated.getObfuscatedCode(), 'utf8');
        console.log('Obfuscated:', file);
    }
    catch (err) {
        console.error('Failed to obfuscate', file, err);
    }
}
for (const dir of nextServerDirs) {
    if (!fs_1.default.existsSync(dir))
        continue;
    walk(dir, (file) => {
        if (!shouldSkip(file))
            obfuscateFile(file);
    });
}
