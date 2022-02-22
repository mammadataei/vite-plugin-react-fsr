import path from 'path'
import { ResolvedOptions } from './types'
import { RouteObject } from 'react-router-dom'
import type { RouteNode } from './RouteTree'
import { isDirectory, normalizeFilenameToRoute } from './utils'

function createRouteElement(filePath: string) {
  return `::React.createElement(React.lazy(() => import("/${filePath}")))::`
}

export class RouteModule {
  private options: ResolvedOptions

  private routes: RouteObject | undefined

  constructor(options: ResolvedOptions) {
    this.options = options
  }

  private absolutePath(filePath: string) {
    return path.join(this.options.root, filePath)
  }

  buildRouteObject(rootNode: RouteNode) {
    this.routes = this.createRouteObject(rootNode)

    return this.routes
  }

  private createRouteObject(node: RouteNode) {
    if (isDirectory(this.absolutePath(node.path))) {
      return this.createLayoutRoute(node)
    }

    return this.createPageRoute(node)
  }

  private createLayoutRoute(node: RouteNode): RouteObject {
    const layout = node.children.find((child) => child.name === '_layout')

    const element = layout ? { element: createRouteElement(layout.path) } : {}

    return {
      ...element,
      path: normalizeFilenameToRoute(node.name),
      children: node.children
        .filter((child) => child.name !== '_layout')
        .map((child) => this.createRouteObject(child)),
    }
  }

  private createPageRoute(node: RouteNode): RouteObject {
    const path =
      node.name === 'index'
        ? { index: true }
        : { path: normalizeFilenameToRoute(node.name) }

    return {
      ...path,
      element: createRouteElement(node.path),
    }
  }

  generate() {
    const code: Array<string> = []
    code.push("import React from 'react';\n")

    const routesString = JSON.stringify(this.routes, null, 2)
      .replace(/\\"/g, '"') // check this
      .replace(/("::|::")/g, '')

    code.push(`export const routes = [${routesString}]\n`)

    return code.join('\n')
  }
}