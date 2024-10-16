// utils.js

import clipboardy from 'clipboardy';
import { readFile } from 'fs/promises';
import fg from 'fast-glob';
import * as path from 'path';
import { Project } from 'ts-morph';
import inquirer from 'inquirer';
import { promises as fs } from 'fs';

/**
 * @typedef {Object} Config
 * @property {string} name
 * @property {string} description
 * @property {string[]} technologies
 * @property {boolean} includeTypes
 * @property {boolean} includeFiles
 * @property {boolean} compress
 * @property {string[]} include
 * @property {string} [projectRoot]
 * @property {string} [editor]
 */

/**
 * Parse the configuration file.
 * @param {string} configPath
 * @returns {Promise<Config>}
 */
export async function parseConfig(configPath) {
  let currentDir = path.dirname(configPath);

  while (true) {
    const configFilePath = path.join(currentDir, path.basename(configPath));
    try {
      const configContent = await readFile(configFilePath, 'utf-8');
      const config = JSON.parse(configContent);
      return config;
    } catch {
      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) {
        throw new Error(`Configuration file ${configPath} not found.`);
      }
      currentDir = parentDir;
    }
  }
}

/**
 * Process files based on patterns.
 * @param {string[]} filePatterns
 * @returns {Promise<string>}
 */
export async function processFiles(filePatterns) {
  let content = '';
  const files = await fg(filePatterns);

  for (const file of files) {
    const fileContent = await readFile(file, 'utf-8');
    content += `--------  ${file} --------\n`;
    content += fileContent;
    content += `\n-------- EOF --------\n\n`;
  }

  return content;
}

/**
 * Include TypeScript types from the project.
 * @param {string} projectRoot
 * @returns {Promise<string>}
 */
export async function includeTypes(projectRoot) {
  let project;
  const tsConfigPath = path.join(projectRoot, 'tsconfig.json');

  try {
    await fs.access(tsConfigPath);
    // tsconfig.json exists
    project = new Project({
      tsConfigFilePath: tsConfigPath,
      skipAddingFilesFromTsConfig: false,
    });
  } catch {
    // tsconfig.json does not exist
    console.warn(`Warning: tsconfig.json not found at ${tsConfigPath}. Attempting to include all .ts files in the project.`);
    project = new Project();

    // Find all .ts and .tsx files in the project
    const tsFiles = await fg(['**/*.ts', '**/*.tsx'], {
      cwd: projectRoot,
      ignore: ['node_modules/**', '**/*.d.ts'],
    });

    if (tsFiles.length === 0) {
      console.warn('No TypeScript files found to include types from.');
      return ''; // Return empty content
    }

    // Add source files to the project
    tsFiles.forEach((file) => {
      project.addSourceFileAtPath(path.join(projectRoot, file));
    });
  }

  const sourceFiles = project.getSourceFiles();

  const typeAliases = sourceFiles.flatMap((sourceFile) =>
    sourceFile.getTypeAliases()
  );

  const interfaces = sourceFiles.flatMap((sourceFile) =>
    sourceFile.getInterfaces()
  );

  if (typeAliases.length === 0 && interfaces.length === 0) {
    console.warn('No TypeScript types or interfaces found in the project.');
    return ''; // Return empty content
  }

  let content = '-------- TypeScript Types --------\n';

  for (const typeAlias of typeAliases) {
    content += typeAlias.getText() + '\n\n';
  }

  for (const interfaceDec of interfaces) {
    content += interfaceDec.getText() + '\n\n';
  }

  content += '-------- EOF --------\n\n';

  return content;
}

/**
 * Compress the content by minifying it (remove unnecessary whitespace).
 * @param {string} content
 * @returns {string}
 */
export function compressContent(content) {
  // Remove multiple consecutive whitespace characters
  let compressedContent = content.replace(/\s+/g, ' ');

  // Optionally, remove single-line comments (e.g., // comment)
  compressedContent = compressedContent.replace(/\/\/.*(?=[\n\r])/g, '');

  // Optionally, remove multi-line comments (e.g., /* comment */)
  compressedContent = compressedContent.replace(/\/\*[\s\S]*?\*\//g, '');

  // Trim leading and trailing whitespace
  compressedContent = compressedContent.trim();

  return compressedContent;
}

/**
 * Prompt the user to enter their question using an editor.
 * @param {string} editor - The editor to use.
 * @returns {Promise<string>}
 */
export async function promptForQuestion(editor) {
  // If editor is provided, use it; otherwise, prompt the user
  if (!editor) {
    const defaultEditor = process.env.EDITOR || process.env.VISUAL || 'vim';

    // Ask the user which editor to use, defaulting to the environment variable or 'vim'
    const response = await inquirer.prompt([
      {
        type: 'input',
        name: 'editor',
        message: `Please enter the editor you would like to use (default is ${defaultEditor}):`,
        default: defaultEditor,
        validate: (input) => {
          return input.trim() !== '' || 'Editor cannot be empty.';
        },
      },
    ]);
    editor = response.editor;
  }

  // Inform the user that the editor will open
  console.log(`\nOpening ${editor}...`);
  console.log('Please type your question. Save and close the editor when you are finished.\n');

  // Now prompt for the question using the specified editor
  try {
    const { question } = await inquirer.prompt([
      {
        type: 'editor',
        name: 'question',
        message: '',
        default: '',
        editor: editor,
      },
    ]);

    return question.trim();
  } catch (error) {
    console.error(`Error: Unable to open editor '${editor}'. Please ensure it is installed and in your PATH.`);
    process.exit(1);
  }
}

/**
 * Create the configuration file.
 * @param {boolean} interactive
 * @returns {Promise<Config>}
 */
export async function createConfig(interactive) {
  // Default values
  let name = 'My Project';
  let description = 'Describe your project here';
  let technologies = [];
  let includeTypes = true;
  let includeFiles = true;
  let compress = false;
  let include = [
    'package.json',
    // 'prisma/schema.prisma',
    // 'src/**/*.ts',
    // 'src/**/*.tsx',
  ];
  let projectRoot = './';
  let editor = process.env.EDITOR || process.env.VISUAL || 'vim';

  // Attempt to auto-detect project name and technologies
  try {
    const packageJsonPath = path.resolve('package.json');
    const packageJsonContent = await readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);
    name = packageJson.name || name;

    technologies = Object.keys({
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    });
  } catch {
    // Ignore errors; use defaults
  }

  if (interactive) {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Project Name:',
        default: name,
      },
      {
        type: 'input',
        name: 'description',
        message: 'Description:',
        default: description,
      },
      {
        type: 'confirm',
        name: 'includeTypes',
        message: 'Include TypeScript types?',
        default: includeTypes,
      },
      {
        type: 'confirm',
        name: 'includeFiles',
        message: 'Include specified files?',
        default: includeFiles,
      },
      {
        type: 'confirm',
        name: 'compress',
        message: 'Compress the output?',
        default: compress,
      },
      {
        type: 'input',
        name: 'projectRoot',
        message: 'Project root directory:',
        default: projectRoot,
      },
      {
        type: 'input',
        name: 'include',
        message: 'Files to include (comma-separated globs):',
        default: include.join(', '),
        filter: (input) => input.split(',').map((s) => s.trim()),
      },
      {
        type: 'input',
        name: 'editor',
        message: 'Default editor to use:',
        default: editor,
        validate: (input) => {
          return input.trim() !== '' || 'Editor cannot be empty.';
        },
      },
    ]);

    name = answers.name;
    description = answers.description;
    includeTypes = answers.includeTypes;
    includeFiles = answers.includeFiles;
    compress = answers.compress;
    projectRoot = answers.projectRoot;
    include = answers.include;
    editor = answers.editor;
  }

  return {
    name,
    description,
    technologies,
    includeTypes,
    includeFiles,
    compress,
    include,
    projectRoot,
    editor,
  };
}

/**
 * Copy content to the clipboard.
 * @param {string} content
 * @returns {Promise<void>}
 */
export async function copyToClipboard(content) {
  await clipboardy.write(content);
}
