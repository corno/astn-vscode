# TODO: documentation

for better syntax highlighting, add this to your settings.json file:
-CMD/CTRL + SHIFT + P 
-Open Settings (JSON)

```` JSON

    "editor.tokenColorCustomizations": {
        "textMateRules": [
            {
                "scope": "string.astn",
                "settings": {
                    "foreground": "#CE9178"
                }
            },
            {
                "scope": "support.type.apostrophed-string.astn",
                "settings": {
                    "foreground": "#9CDCFE"
                }
            },
            {
                "scope": "support.type.backticked-string.astn",
                "settings": {
                    "foreground": "#cea978"
                }
            },
        ]
    },
````