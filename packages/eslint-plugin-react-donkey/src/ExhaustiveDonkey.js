// @flow

const findChildVariables = node => {
    const nodes = new Set()
    depthFirstSearch(node, child => {
        if (child.type === "MemberExpression" || child.type === "Identifier") {
            nodes.add(child)
            return false
        }
        return true
    })
    return nodes
}

// not that breadth-first would be any different
const depthFirstSearch = (node, onFoundNode) => {
    if (node == null) {
        return true
    }
    if (Array.isArray(node)) {
        for (const subnode of node) {
            const shouldContinue = depthFirstSearch(subnode, onFoundNode)
            if (shouldContinue === false) {
                return true
            }
        }
    }
    if (typeof node === "object") {
        if (node.type != null) {
            const shouldContinue = onFoundNode(node)
            if (shouldContinue === false) {
                return true
            }
            for (const key in node) {
                if (key === "parent") {
                    continue
                }
                const shouldContinue = depthFirstSearch(node[key], onFoundNode)
                if (shouldContinue === false) {
                    return true
                }
            }
        }
    }
    return true
}

module.exports = {
    meta: {
        type: "problem",
        schema: [], // no options
    },
    create: function(context) {
        const globalScope = context.getScope()
        const moduleScope = context
            .getScope()
            .childScopes.find(s => s.type === "module")
        const ignoreVars = [
            ...globalScope.through.map(ref => ref.identifier.name),
            ...globalScope.variables.map(v => v.name),
            ...moduleScope.variables.map(v => v.name),
        ]
        return {
            JSXOpeningElement(node) {
                if (node.name.name !== "Donkey") {
                    return
                }
                if (node.attributes.length === 0) {
                    context.report({
                        node,
                        message:
                            "React Donkey must be called with the deps prop.",
                    })
                    return
                }
                const deps = node.attributes.find(
                    att => att.name.name === "deps",
                )
                if (deps == null) {
                    context.report({
                        node,
                        message:
                            "React Donkey must only be called with the deps prop.",
                    })
                    return
                }

                const childMembers = [
                    ...findChildVariables(node.parent.children),
                ]

                const childIdentifierNames = childMembers
                    .filter(c => c.type === "Identifier")
                    .map(i => i.name)
                const childMemberPaths = childMembers.map(
                    toPropertyAccessString,
                )

                const childExpression = deps.value.expression
                if (childExpression.type !== "ArrayExpression") {
                    context.report({
                        node: childExpression,
                        message: "React Donkey's deps must be an array.",
                    })
                    return
                }
                const specifiedDeps = childExpression.elements
                for (const dep of specifiedDeps) {
                    if (
                        dep.type !== "Identifier" &&
                        dep.type !== "MemberExpression"
                    ) {
                        context.report({
                            node: dep,
                            message:
                                "React Donkey's deps should only be variables.",
                        })
                    }
                }

                const depsToTest = specifiedDeps.filter(
                    d =>
                        d.type === "Identifier" ||
                        d.type === "MemberExpression",
                )

                const missingChildPaths = []
                const depsWhichSatisfiedChild = new Set()
                for (const childPath of childMemberPaths) {
                    const depNodeThatSatisfies = depsToTest.find(node => {
                        return childPath.startsWith(
                            toPropertyAccessString(node),
                        )
                    })
                    const childIsSpecified = depNodeThatSatisfies != null
                    if (depNodeThatSatisfies != null) {
                        depsWhichSatisfiedChild.add(depNodeThatSatisfies)
                    }
                    const isCoveredByGlobalVar = ignoreVars.some(ignoreVar =>
                        childPath.startsWith(ignoreVar),
                    )
                    if (
                        childIsSpecified === false &&
                        isCoveredByGlobalVar === false
                    ) {
                        missingChildPaths.push(childPath)
                    }
                }

                const unusedDeps = []
                const globalDeps = []
                for (const dep of depsToTest) {
                    if (depsWhichSatisfiedChild.has(dep) === false) {
                        unusedDeps.push(dep)
                    }
                    const depString = toPropertyAccessString(dep)
                    const isGlobal = ignoreVars.some(ignoreVar => depString.startsWith(ignoreVar))
                    if (isGlobal) {
                        globalDeps.push(dep)
                    }
                }

                if (missingChildPaths.length > 0) {
                    const uniqueUnspecifiedNames = [
                        ...new Set(missingChildPaths),
                    ]
                    context.report({
                        node: deps,
                        message: `React Donkey is missing some deps: ${uniqueUnspecifiedNames.join(
                            ", ",
                        )}.`,
                    })
                }

                unusedDeps.forEach(dep => {
                    context.report({
                        node: dep,
                        message: `Unused dep: '${toPropertyAccessString(dep)}'`
                    })
                })
                globalDeps.forEach(dep => {
                    context.report({
                        node: dep,
                        message: `Unnecessary dep: '${toPropertyAccessString(dep)}'`
                    })
                })
            },
        }
    },
}

/**
 * STOLEN from the react eslint exhaustive hooks rule.
 * Assuming () means the passed node.
 * (foo) -> 'foo'
 * foo.(bar) -> 'foo.bar'
 * foo.bar.(baz) -> 'foo.bar.baz'
 * Otherwise throw.
 */
function toPropertyAccessString(node) {
    if (node.type === "Identifier") {
        return node.name
    } else if (node.type === "MemberExpression" && !node.computed) {
        const object = toPropertyAccessString(node.object)
        const property = toPropertyAccessString(node.property)
        return `${object}.${property}`
    } else {
        throw new Error(`Unsupported node type: ${node.type}`)
    }
}
