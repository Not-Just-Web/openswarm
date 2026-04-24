# Token Optimization with Graphify

## Overview

To reduce LLM token usage and improve agent context understanding, we use **Graphify**.

## How it Works

Graphify parses the codebase using `tree-sitter` and builds a knowledge graph of:

- Function calls
- Class relationships
- Import structures
- Documentation links

## Usage

Agents can run `graphify run .` to generate a `graph.json`. Instead of reading every file, agents query this graph to find relevant code snippets, reducing token overhead by up to 70%.

## Installation

Graphify is pre-installed in the `supervisor` and `dashboard` containers via `pip3 install graphifyy`.
