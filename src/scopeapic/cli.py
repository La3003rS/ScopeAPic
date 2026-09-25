import argparse
import json

from .metadata import analyze_photo


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Analyze image metadata with ScopeAPic."
    )

    parser.add_argument(
        "image",
        help="Path to an image",
    )

    args = parser.parse_args()

    result = analyze_photo(args.image)

    print(
        json.dumps(
            result,
            indent=2,
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
