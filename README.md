# RoboFact Challenge - Innovation Camp

![RoboFact Logo](/automation_designer/dist/img/robofact.png)

**A Visual & AR Sales Assistant for RoboFact**  
This project was created for the hackathon at Innovation Camp St. Gallen with the challenge for RoboFact. It assists in sales by visualizing and showcasing the automation process using RoboFact's innovative robotic solutions and custom automation modulations on the fly.

![Example Screenshot](/automation_designer/dist/img/screen.png)

## Table of Contents

- [Requirements](#requirements)
- [Installation](#installation)
- [Build Instructions](#build-instructions)
- [Serve Instructions (Development)](#serve-instructions-development)
- [Folder Structure](#folder-structure)
- [Dependencies](#dependencies)
- [License](#license)

## Requirements

Before you begin, ensure you have the following installed:

*   **Node.js:** (version 16 or higher recommended) - [https://nodejs.org/](https://nodejs.org/)
*   **npm** (Node Package Manager): Typically comes with Node.js
*   **A web browser:** (Chrome, Firefox, Safari, etc.)

## Installation

1.  **Clone the repository:**

    ```bash
    git clone <repository_url>
    cd <project_directory>
    ```

2.  **Install project dependencies:**

    ```bash
    npm install
    ```

    Download model from https://starux.ch/default_arm.glb -> automation_designer/dist/default_arm.glb

    This command will install all the necessary packages listed in the `package.json` file.

## Build Instructions

Building the project prepares it for deployment by optimizing the code and assets.

1.  **Run the build command:**

    ```bash
    npm run build
    ```

    This command executes the Webpack build process, configured in `webpack.config.js`. It will generate optimized files (JavaScript bundles, assets) within the `dist` directory.

    *   `webpack --mode production`: This command tells Webpack to build the project in **production** mode, enabling optimizations like minification and tree shaking for improved performance.

## Serve Instructions (Development)

For local development, use the Webpack Dev Server to automatically rebuild and serve the project as you make changes.

1.  **Run the serve command:**

    ```bash
    npm start
    ```

    This command starts the Webpack Dev Server, which will:

    *   Watch your source files for changes.
    *   Automatically rebuild the project when you save files.
    *   Serve the built files from memory, providing fast updates.
    *   Open your web browser to the specified port (typically `http://localhost:8080`, but check your `webpack.config.js`).

    *  `webpack serve --mode development`:  This command tells Webpack to serve the project in **development** mode.

## Folder Structure

```bash
project-root/
├── dist/ #Some assets and build 
│   └── img/          # Images (e.g., logo and example screenshot)
│   └── models/          # Models
├── src/ # Source code directory
│ ├── index.js # Main entry point of your application
│ └── ... # Other source files, assets, etc.
├── package.json # Project metadata and dependencies
├── package-lock.json # Records the exact versions of dependencies
├── webpack.config.js # Webpack configuration file
└── README.md # This file
```
## Dependencies

The project uses the following dependencies (listed in `package.json`):

### DevDependencies (for development)

*   `three`: Core Three.js library
*   `webpack`: Module bundler
*   `webpack-cli`: Command line interface for Webpack
*   `webpack-dev-server`: Development server for Webpack

### Dependencies (required at runtime)

*   `three-gltf-loader`: GLTF model loader
*   `three-orbitcontrols`: Orbit camera controls
*   `three-transform-controls`: Transform controls for object manipulation
*   `three-transformcontrols`: Another package for transform controls (may need to review which one is needed)

## Credits
Free Models: This project uses free models sourced from BlenderKit. Proper attribution is given to BlenderKit for providing high-quality free models that have been incorporated into this project.

## License

MIT License

Copyright (c) [2025] [Team RoboFact Innovation Camp]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.