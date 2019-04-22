import babel from "rollup-plugin-babel"
import copy from "rollup-plugin-copy"

import pkg from "./package.json"

export default [
    {
        input: "src/index.js",
        output: {
            name: "react-donkey",
            file: pkg.browser,
            format: "umd",
            globals: {
                react: "React",
            },
        },
        plugins: [
            babel({ exclude: "node_modules/**" }),
            copy({
                targets: { types: "build" },
            }),
        ],
    },
    {
        input: "src/index.js",
        external: ["react"],
        output: [
            { file: pkg.main, format: "cjs" },
            { file: pkg.module, format: "es" },
        ],
        plugins: [babel({ exclude: "node_modules/**" })],
    },
]
