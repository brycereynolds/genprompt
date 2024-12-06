# genprompt

I wrote `genprompt` as a tool to help me generate prompts for LLMs. It allows you to setup some basic configuration (see .genprompt.json) that informs the context of all generated prompts, and will include additional information as you use the generate command.

I often found myself repeating the steps in order to set context for my prompts; this project is blah blah and does this, it uses these technologies, here is an example of my patterns, etc., Hopefully this helps streamline that process.

So for example, I'm working on a React app and I have a context file and some components. I want the LLM to know about these things in addition to the prisma schema I have in place...

Here’s what my `.genprompt.json might look like for this setup:

```json
{
  "name": "My React App",
  "description": "A React app with Prisma for the backend",
  "technologies": ["react", "prisma"],
  "includeTypes": true,
  "includeFiles": true,
  "compress": false,
  "include": [
    "prisma/schema.prisma"
  ],
  "projectRoot": "./"
}
```
> Note: The technologies field specifies the technologies used. While the tool automatically pulls in dependencies from your package.json, you can limit or specify them in the .genprompt.json file as you see fit.

And here’s how I would use the `generate` command to grab my context files, Prisma schema, and select a few key components:

```bash
genprompt generate --files context/* components/Header.js components/Footer.js --question
```

Since I used the `--question` flag, the tool will open my default editor allowing me to type out my question. Once I save that file, then the full output is saved to my clipboard (you can also specify an output file with the `--output` flag if you want it locally).

I generally would just paste that in. Most of the time you do this at the beginning to set the stage for a conversation with the LLM, but you may use it to "refresh" the LLM again later after you've made updates.

---

## Table of Contents
- [Overview](#overview)
- [Installation](#installation)
- [Features](#features)
- [Usage](#usage)
  - [Generate a Prompt](#generate-a-prompt)
  - [Initialize Configuration](#initialize-configuration)
- [Configuration File (`.genprompt.json`)](#configuration-file-genpromptjson)
- [Command Options](#command-options)
- [Examples](#examples)
- [Future Enhancements](#future-enhancements)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

The `genprompt` tool simplifies the process of creating prompt files by automatically gathering files, code snippets, and project types into a single output. This output can either be copied directly to the clipboard or saved to a specified file. The tool leverages a configuration file (`.genprompt.json`) to determine what files to include, whether to include TypeScript types, and if the output should be compressed. It’s particularly useful when working with AI tools that need structured project context for code generation or problem-solving.

---

## Installation

Ensure you have Node.js installed. Then, install the package globally:

```bash
npm install -g genprompt
```

Alternatively, you can run it locally by cloning the repository and using `npm`:

```bash
git clone https://github.com/brycereynolds/genprompt
cd genprompt
npm install
npm link

# Go to the project you want to generate a prompt for
cd my-project

# Run the init command to get started
genprompt init

# Run the generate command
genprompt generate
```

---

## Features

- **Project-Aware Configuration**: Leverage a `.genprompt.json` file to configure files and patterns to include.
- **TypeScript Support**: Automatically extract and include TypeScript types and interfaces from your project.
- **Clipboard Integration**: Copy the generated prompt directly to the clipboard for easy sharing or use in other tools.
- **Content Compression**: Optional output compression to minimize file size.
- **Interactive Mode**: Prompt the user to add a question or interact with an editor directly.
- **Flexible File Matching**: Use glob patterns to include specific files or directories.

---

## Usage

### Initialize Configuration

To set up a new `.genprompt.json` configuration file, use the following command:

```bash
genprompt init
```

You can accept defaults by adding the `-y` flag or force overwriting an existing configuration with `--force`.

### Generate a Prompt

The primary function of `genprompt` is to generate a prompt based on the project context. 

The `generate` command collects specified files, TypeScript types, and other project context to create a comprehensive prompt, which can be copied to the clipboard or saved to a file.

```bash
genprompt generate [options]
```

The default command will use the `.genprompt.json` configuration file and save the output to your clipboard.

```bash
genprompt generate --question
```

This command will open your default editor to allow you to type out your question. Once you save and close the editor, the output will be saved to your clipboard with all the context you've setup.


#### Example:

```bash
genprompt generate --compress --output prompt.txt
```

This command generates the prompt using the `.genprompt.json` configuration (default), compresses the content, and saves it to `prompt.txt`.


## Configuration File (`.genprompt.json`)

The `.genprompt.json` file defines how `genprompt` behaves. Below is a sample configuration:

```json
{
  "name": "My Project",
  "description": "Use this to describe the goals of your project. If you find yourself repeating something often to an LLM to get context, you could add that here to save youself time.",
  "technologies": ["node", "typescript"],
  "includeTypes": true,
  "includeFiles": true,
  "compress": false,
  "include": [
    "package.json",
    "src/**/*.ts",
    "docs/**/*.md"
  ],
  "projectRoot": "./",
  "editor": "vim"
}
```

- **`name`**: Name of the project.
- **`description`**: A short description of the project.
- **`technologies`**: List of technologies used in the project.
- **`includeTypes`**: Include TypeScript types and interfaces.
- **`includeFiles`**: Include the files listed in your config. You can also specify additional files with the `-f` flag while running the `generate` command.
- **`compress`**: Compress the output (remove whitespace)
- **`include`**: File patterns to include in the prompt for all generations. I often use this for my package.json and prisma schema, etc.
- **`projectRoot`**: Root directory of the project.
- **`editor`**: Default editor for interactive prompts.

---

## Command Options

### `generate` Command Options:

- **`-c, --config <path>`**: Path to the config file (default: `.genprompt.json`).
- **`-o, --output <path>`**: Output file (default: clipboard).
- **`--compress`**: Compress the content.
- **`--include-all [pattern]`**: Include all files matching the pattern.
- **`-f, --files <patterns...>`**: Additional files to include.
- **`-q, --question`**: Prompt for a question from the user.
- **`-e, --editor <editor>`**: Specify the editor to use.

### `init` Command Options:

- **`-y, --yes`**: Accept all defaults and skip prompts.
- **`-f, --force`**: Overwrite existing `.genprompt.json`.

---

## Examples

1. **Generate a Compressed Prompt to Clipboard:**

    ```bash
    genprompt generate --compress
    ```

2. **Include Specific Files and Save to File:**

    ```bash
    genprompt generate -f README.md src/index.js -o prompt.txt
    ```

3. **Interactive Question Prompt:**

    ```bash
    genprompt generate --question --editor code
    ```

4. **Initialize Default Configuration:**

    ```bash
    genprompt init -y
    ```

---

## Future Enhancements

- **GIF Demo**: We plan to add a GIF showing typical usage to enhance the documentation.
- **Integration with Git Hooks**: Automate prompt generation on commits.
- **Improved Compression Algorithms**: Enhance the compression feature for even smaller output sizes.
- **Support for YAML Configuration**: Add support for YAML as an alternative configuration format.

---

## Contributing

We welcome contributions! If you’d like to contribute:
1. Fork the repository.
2. Create a feature branch.
3. Submit a pull request with a detailed description.

---

## License

This project is licensed under the ISC License.

---
