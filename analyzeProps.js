import { Project } from "ts-morph";

/**
 * Analyze props for a given component and resolve nested types up to a specified depth.
 * @param {string} filePath - Path to the component file.
 * @param {number} maxDepth - Maximum depth to resolve nested types.
 * @returns {object} Summary of props and types, and a count of skipped items.
 */
export async function analyzeComponentProps(filePath, maxDepth = 2) {
  const project = new Project();
  const sourceFile = project.addSourceFileAtPath(filePath);

  const components = sourceFile.getExportedDeclarations();
  const result = {};
  let skippedCount = 0;

  console.log(`Analyzing file: ${filePath}`);
  console.log(`Exported declarations: ${Array.from(components.keys()).join(', ')}`);

  for (const [name, declarations] of components) {
    let processed = false;

    console.log(`Processing declaration: ${name}`);

    declarations.forEach((declaration) => {
      try {
        // Detect React.forwardRef components via AST
        if (isForwardRef(declaration)) {
          console.log(`Detected forwardRef component: ${name}`);
          const propsType = extractForwardRefPropsType(declaration);
          if (propsType) {
            console.log(`Extracted props type for ${name}: ${propsType.getText()}`);
            result[name] = resolveTypeRecursively(propsType, maxDepth);
            processed = true;
          }
        }

        // Detect standard React components via AST
        if (!processed && isReactComponent(declaration)) {
          console.log(`Detected React component: ${name}`);
          const propsType = extractPropsType(declaration);
          if (propsType) {
            console.log(`Extracted props type for ${name}: ${propsType.getText()}`);
            result[name] = resolveTypeRecursively(propsType, maxDepth);
            processed = true;
          } else {
            console.log(`No props type found for ${name}`);
          }
        }

        if (!processed) {
          skippedCount++;
        }
      } catch (error) {
        console.error(`Error processing "${name}" in file "${filePath}": ${error.message}`);
        skippedCount++;
      }
    });
  }

  return { result, skippedCount };
}

/**
 * Check if a declaration is a React.forwardRef component.
 * @param {import("ts-morph").ExportedDeclarations} declaration - The declaration to check.
 * @returns {boolean} True if the declaration is a forwardRef.
 */
function isForwardRef(declaration) {
  if (!declaration.isVariableDeclaration?.()) return false;

  const initializer = declaration.getInitializer();
  if (!initializer || !initializer.isCallExpression()) return false;

  const expression = initializer.getExpression();
  if (!expression || !expression.getText().endsWith("forwardRef")) return false;

  const importSource = resolveImportSource(expression);
  return importSource === "react"; // Ensure it's the React forwardRef
}

/**
 * Resolve the source of an import for a given symbol.
 * @param {import("ts-morph").Node} node - The AST node to resolve.
 * @returns {string|null} The module source of the import, or null if not found.
 */
function resolveImportSource(node) {
  const symbol = node.getSymbol();
  if (!symbol) return null;

  const declarations = symbol.getDeclarations();
  if (declarations.length === 0) return null;

  const importDeclaration = declarations[0].getFirstAncestorByKind("ImportDeclaration");
  return importDeclaration ? importDeclaration.getModuleSpecifierValue() : null;
}

/**
 * Check if a declaration is a React component (function or class).
 * @param {import("ts-morph").ExportedDeclarations} declaration - The declaration to check.
 * @returns {boolean} True if the declaration is a React component.
 */
function isReactComponent(declaration) {
  if (declaration.isClass?.()) return true;

  if (declaration.isFunction?.()) {
    const params = declaration.getParameters();
    return params.length > 0 && params[0].getType().isObject(); // Check for props parameter
  }

  if (declaration.isVariableDeclaration?.()) {
    const initializer = declaration.getInitializer();
    if (!initializer || !initializer.isArrowFunction()) return false;

    const params = initializer.getParameters();
    return params.length > 0 && params[0].getType().isObject(); // Check for props parameter
  }

  return false;
}

/**
 * Extract the props type from a React component declaration.
 * @param {import("ts-morph").ExportedDeclarations} declaration - The React component declaration.
 * @returns {import("ts-morph").Type} The props type, or null if none found.
 */
function extractPropsType(declaration) {
  if (declaration.isFunction?.() || declaration.isVariableDeclaration?.()) {
    const params = declaration.getParameters?.() || declaration.getInitializer()?.getParameters();
    return params && params[0] ? params[0].getType() : null;
  }
  return null;
}

/**
 * Extract the props type from a React.forwardRef declaration.
 * @param {import("ts-morph").ExportedDeclarations} declaration - The React.forwardRef declaration.
 * @returns {import("ts-morph").Type} The props type, or null if none found.
 */
function extractForwardRefPropsType(declaration) {
  const initializer = declaration.getInitializer();
  if (!initializer || !initializer.isCallExpression()) return null;

  const typeArguments = initializer.getTypeArguments();
  return typeArguments.length >= 2 ? typeArguments[1] : null; // Props type is the second argument
}

/**
 * Recursively resolve the structure of a type.
 * @param {import("ts-morph").Type} type - The type to resolve.
 * @param {number} maxDepth - Maximum depth to traverse.
 * @param {number} currentDepth - Current depth of traversal.
 * @param {Set<string>} visited - Set of visited types to prevent cycles.
 * @returns {object|string} Resolved type structure or string description.
 */
function resolveTypeRecursively(type, maxDepth, currentDepth = 0, visited = new Set()) {
  if (currentDepth > maxDepth) return "Reached max depth";

  const typeName = type.getText();
  if (visited.has(typeName)) return "Circular reference";

  visited.add(typeName);

  try {
    if (type.isArray()) {
      return [`Array of: ${resolveTypeRecursively(type.getArrayElementType(), maxDepth, currentDepth + 1, visited)}`];
    }

    if (type.isObject()) {
      const properties = type.getProperties();
      const result = {};
      properties.forEach((prop) => {
        const propType = prop.getType();
        result[prop.getName()] = resolveTypeRecursively(propType, maxDepth, currentDepth + 1, visited);
      });
      return result;
    }

    return typeName;
  } catch (error) {
    return `Error resolving type "${typeName}": ${error.message}`;
  }
}
