# Qualytics

Qualytics is a powerful VS Code extension that provides code quality metric visualization for TypeScript projects. It helps developers gain insights into their codebase's complexity, maintainability, and overall health.

## Features

- 📊 Visualize key code metrics:
  - Cyclomatic Complexity
  - Maintainability Index
  - Lines of Code
- 📈 Interactive charts for easy metric interpretation
- 🔍 Project-level analysis for pinpointing areas of improvement

## Installation

1. Open VS Code
2. Go to the Extensions view (Ctrl+Shift+X or Cmd+Shift+X on macOS)
3. Search for "Qualytics"
4. Click Install

Alternatively, you can install it from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=aritra741.qualytics).

## Usage

1. Open a TypeScript file in VS Code
2. Open the Command Palette (Ctrl+Shift+P or Cmd+Shift+P on macOS)
3. Type "Qualytics: Show Code Metrics" and press Enter
4. A new panel will open, displaying the metrics for your current file

## Understanding the Metrics

### Cyclomatic Complexity

Measures the number of linearly independent paths through your code. Lower is generally better, as high complexity can indicate code that's difficult to test and maintain.

### Maintainability Index

A composite metric that considers volume, complexity, and lines of code. Scores range from 0 to 100, with higher scores indicating more maintainable code.

### Lines of Code

Counts the number of executable lines in your file, excluding blank lines, comments, and other non-executable statements. This metric provides a clearer picture of your code's actual size and can help identify files that might be too large and in need of refactoring. Remember, while a lower count often indicates more manageable code, it's not always a direct indicator of quality.

## Contributing

We welcome contributions to Qualytics! Here's how you can help:

1. Fork the repository
2. Create a new branch (`git checkout -b feature/AmazingFeature`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
5. Push to the branch (`git push origin feature/AmazingFeature`)
6. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/aritra741/Qualytics/blob/main/LICENSE) file for details.

---

Made with ❤️ by Aritra Mazumder

Got questions or feedback? [Open an issue](https://github.com/aritra741/Qualytics/issues) - I'd love to hear from you!
