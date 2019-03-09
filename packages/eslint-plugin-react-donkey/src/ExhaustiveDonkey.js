// @flow

const walkThrough = node => {
    const identifiers = new Set()
    if (node == null) {
        return identifiers
    }
    if (Array.isArray(node)) {
        node.forEach(subnode => {
            const moreIdentifiers = walkThrough(subnode)
            moreIdentifiers.forEach(id => {
                identifiers.add(id)
            })
        })
    }
    if (typeof node === "object") {
        if (node.type === "Identifier") {
            identifiers.add(node)
            return identifiers
        }
        for (const key in node) {
            if (key === "parent") {
                continue
            }
            const moreIdentifiers = walkThrough(node[key])
            moreIdentifiers.forEach(id => {
                identifiers.add(id)
            })
        }
    }
    return identifiers
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
                const childIdentifiers = walkThrough(node.parent.children)
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
                                message: "Unused dep.",
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
