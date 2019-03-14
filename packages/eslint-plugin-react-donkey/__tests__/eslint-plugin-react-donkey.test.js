"use strict"

const ESLintTester = require("eslint").RuleTester
const ReactDonkeyESLintRule = require("../src").rules["exhaustive-donkey"]

ESLintTester.setDefaultConfig({
    parser: "babel-eslint",
    parserOptions: {
        ecmaVersion: 6,
        sourceType: "module",
    },
})

const tests = {
    valid: [
        {
            code: `<NotDonkey />`,
        },
        {
            code: `<Donkey deps={[]}>{null}</Donkey>`,
        },
        {
            code: `
            const MyComponent = () => {
                var var1, var2
                return <Donkey deps={[var1, var2]}>{var1 + var2}</Donkey>
            }
            `
        },
    ],
    invalid: [
        {
            code: `<Donkey foo={whatever}>{null}</Donkey>`,
            errors: [
                {
                    message:
                        "React Donkey must only be called with the deps prop.",
                    type: "JSXOpeningElement",
                },
            ],
        },
        {
            code: `<Donkey>{null}</Donkey>`,
            errors: [
                {
                    message: "React Donkey must be called with the deps prop.",
                    type: "JSXOpeningElement",
                },
            ],
        },
        {
            code: `<Donkey deps={[() => {}]}>{null}</Donkey>`,
            errors: [
                {
                    message: "React Donkey's deps should only be variables.",
                    type: "ArrowFunctionExpression",
                },
            ],
        },
        {
            code: `<Donkey deps={() => {}}>{null}</Donkey>`,
            errors: [
                {
                    message: "React Donkey's deps must be an array.",
                    type: "ArrowFunctionExpression",
                },
            ],
        },
        {
            code: `
                const Comp = ({ v1, v2 }) => <Donkey deps={[v1, v2]}>{null}</Donkey>
            `,
            errors: [
                {
                    message: "Unused dep: 'v1'",
                    type: "Identifier",
                },
                {
                    message: "Unused dep: 'v2'",
                    type: "Identifier",
                },
            ],
        },
        {
            code: `
                const Comp = ({ var1, var2 }) => (
                    <Donkey deps={[var1]}>
                        <div>
                            {var1}
                            <Thing value={var2} otherThing={var2} />
                        </div>
                    </Donkey>
                )
            `,
            errors: [
                {
                    message: "React Donkey is missing some deps: var2.",
                    type: "JSXAttribute",
                },
            ],
        },
        {
            code: `
                import { thing } from 'some-package'
                const var1 = 3
                const Comp = () => {
                    // strictly this should also be unnecessary, as it cannot
                    // change, but ignore this case for now.
                    const localDep = 8
                    return (
                        <Donkey deps={[var1, thing, localDep, window]}>
                            {var1}
                            {thing}
                            {localDep}
                            {window}
                        </Donkey>)
                }
            `,
            errors: [
                {
                    message: "Unnecessary dep: 'var1'",
                    type: "Identifier",
                },
                {
                    message: "Unnecessary dep: 'thing'",
                    type: "Identifier",
                },
                {
                    message: "Unnecessary dep: 'window'",
                    type: "Identifier",
                },
            ],
        }
    ],
}

const eslintTester = new ESLintTester()
eslintTester.run("exhaustive-donkey", ReactDonkeyESLintRule, tests)
