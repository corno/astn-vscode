#!/usr/bin/env bash

export CODE_TESTS_PATH="$(pwd)/out/client/test"
export CODE_TESTS_WORKSPACE="$(pwd)/client/testFixture"

node "$(pwd)/client/node_modules/vscode/bin/test"