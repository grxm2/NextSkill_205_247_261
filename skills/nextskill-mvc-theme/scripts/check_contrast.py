"""Measure opaque sRGB color pairs using WCAG relative luminance. No dependencies."""

import argparse
import re


def luminance(color):
    if not re.fullmatch(r"#[0-9a-fA-F]{6}", color):
        raise ValueError("Use an opaque six-digit hex color such as #173e56")
    channels = [int(color[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    linear = [v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
              for v in channels]
    return sum(v * weight for v, weight in zip(linear, (0.2126, 0.7152, 0.0722)))


def contrast(foreground, background):
    low, high = sorted((luminance(foreground), luminance(background)))
    return (high + 0.05) / (low + 0.05)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("colors", nargs="*", help="Optional foreground and background hex colors")
    args = parser.parse_args()
    if len(args.colors) not in (0, 2):
        parser.error("Provide zero colors for the theme report, or exactly two colors")
    pairs = [tuple(args.colors)] if args.colors else [
        ("#577b91", "#e2f6ff"), ("#577b91", "#ffffff"),
        ("#087faa", "#e2f6ff"), ("#087faa", "#ffffff"),
        ("#ffffff", "#087faa"), ("#086189", "#e2f6ff"),
        ("#173e56", "#e2f6ff"),
    ]
    for foreground, background in pairs:
        try:
            ratio = contrast(foreground, background)
        except ValueError as error:
            parser.error(str(error))
        result = "PASS" if ratio >= 4.5 else "FAIL"
        print(f"{foreground} on {background}: {ratio:.4f}:1 | normal text AA: {result}")


if __name__ == "__main__":
    main()
