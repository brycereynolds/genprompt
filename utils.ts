import clipboardy from 'clipboardy';
import { readFile } from 'fs/promises';
import fg from 'fast-glob';
import * as path from 'path';
import { Project } from 'ts-morph';
import LZString from 'lz-string';
import inquirer from 'inquirer';

interface Config {
  name: string;
  description: string;
  technologies: string[];
  includeTypes: boolean;
  includeFiles: boolean;
  compress: boolean;
  include: string[];
  projectRoot?: string;
}

export async function parseConfig(configPath: string): Promise<Config> {
    let currentDir = path.dirname(configPath);
  
    while (true) {
      const configFilePath = path.join(currentDir, path.basename(configPath));
      try {
        const configContent = await readFile(configFilePath, 'utf-8');
        const config: Config = JSON.parse(configContent);
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
  
export async function processFiles(filePatterns: string[]): Promise<string> {
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

export async function includeTypes(projectRoot: string): Promise<string> {
  const project = new Project({
    tsConfigFilePath: path.join(projectRoot, 'tsconfig.json'),
    skipAddingFilesFromTsConfig: false,
  });

  const sourceFiles = project.getSourceFiles();

  const typeAliases = sourceFiles.flatMap((sourceFile) =>
    sourceFile.getTypeAliases()
  );

  const interfaces = sourceFiles.flatMap((sourceFile) =>
    sourceFile.getInterfaces()
  );

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

export function compressContent(content: string): string {
  // Optional: Implement your own compression or summarization
  return LZString.compressToUTF16(content);
}

export async function createConfig(interactive: boolean): Promise<Config> {
  // Default values
  let name = 'My Project';
  let description = 'Describe your project here';
  let technologies: string[] = [];
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
        filter: (input: string) => input.split(',').map((s) => s.trim()),
      },
    ]);

    name = answers.name;
    description = answers.description;
    includeTypes = answers.includeTypes;
    includeFiles = answers.includeFiles;
    compress = answers.compress;
    projectRoot = answers.projectRoot;
    include = answers.include;
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
  };
}

export async function copyToClipboard(content: string): Promise<void> {
    await clipboardy.write(content);
}
  