// @flow

import { Component, type Node } from "react"

type Props = {|
    deps: Array<any>,
    children: Node,
|}

class Donkey extends Component<Props> {
    shouldComponentUpdate(nextProps: Props) {
        if (nextProps.deps === this.props.deps) {
            return false
        }

        if (nextProps.deps.length !== this.props.deps.length) {
            return true
        }
        for (let i = 0; i < nextProps.deps.length; i++) {
            if (nextProps.deps[i] !== this.props.deps[i]) {
                return true
            }
        }

        return false
    }
    render() {
        return this.props.children
    }
}

export default Donkey
