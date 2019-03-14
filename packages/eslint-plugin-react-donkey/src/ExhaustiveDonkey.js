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
                        if (ignoreVars.includes(dep.name)) {
                            context.report({
                                node: dep,
                                message: `Unnecessary dep: '${dep.name}'`,
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
