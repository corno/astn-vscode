# TODO: documentation

for better syntax highlighting, add this to your settings.json file:
```` JSON

    "editor.tokenColorCustomizations": {
        "textMateRules": [
            {
                "scope": "string.astn",
                "settings": {
                    "foreground": "#48d62c"
                }
            },
            {
                "scope": "support.type.aposthrophed-string.in-type.astn",
                "settings": {
                    "foreground": "#272796"
                }
            },
            {
                "scope": "support.type.aposthrophed-string.other.astn",
                "settings": {
                    "foreground": "#6d2121"
                }
            },
            {
                "scope": "support.type.aposthrophed-in-dictionary.astn",
                "settings": {
                    "foreground": "#8d1c97"
                }
            }
        ]
    }
````