// @flow

const walkThrough = (node, type) => {
    const identifiers = new Set()
    depthFirstSearch(node, child => {
        if (child.type === type) {
            identifiers.add(child)
        }
        return true
    })
    return identifiers
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
                return false
            }
        }
    }
    if (typeof node === "object") {
        if (node.type != null) {
            const shouldContinue = onFoundNode(node)
            if (shouldContinue === false) {
                return false
            }
            for (const key in node) {
                if (key === "parent") {
                    continue
                }
                const shouldContinue = depthFirstSearch(node[key], onFoundNode)
                if (shouldContinue === false) {
                    return false
                }
            }
        }
    }
    return true
}

const isFunctionExpressionTopLevel = node => {
    // For nodes that are either FunctionExpression,ArrowFunctionExpression,FunctionDeclaration
    const parent = node.parent
    if (parent == null) {
        // not even sure if this is possible
        return false
    }
    // document what it catches
    if (
        parent.type === "VariableDeclarator" &&
        parent.parent.type === "VariableDeclaration" &&
        parent.parent.parent.type === "Program"
    ) {
        return true
    }
    if (parent.type === "Program") {
        return true
    }
    return false
}

module.exports = {
    meta: {
        type: "problem",
        schema: [], // no options
    },
    create: function(context) {
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
                const childIdentifiers = walkThrough(
                    node.parent.children,
                    "Identifier",
                )
                const childIdentifierNames = [...childIdentifiers].map(
                    i => i.name,
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
                    if (dep.type !== "Identifier") {
                        context.report({
                            node: dep,
                            message:
                                "React Donkey's deps should only be variables.",
                        })
                    } else {
                        if (childIdentifierNames.includes(dep.name) !== true) {
                            context.report({
                                node: dep,
                                message: `Unused dep: '${dep.name}'`,
                            })
                        }
                    }
                }

                const unspecifiedNames = []
                const givenDepIdentifierNames = specifiedDeps
                    .filter(d => d.type === "Identifier")
                    .map(d => d.name)
                for (const name of childIdentifierNames) {
                    if (givenDepIdentifierNames.includes(name) === false) {
                        unspecifiedNames.push(name)
                    }
                }
                if (unspecifiedNames.length > 0) {
                    const uniqueUnspecifiedNames = [
                        ...new Set(unspecifiedNames),
                    ]
                    context.report({
                        node: deps,
                        message: `React Donkey is missing some deps: ${uniqueUnspecifiedNames.join(
                            ", ",
                        )}.`,
                    })
                }
            },
        }
    },
}
