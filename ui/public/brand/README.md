# Brand logo

Put the official logo file in this folder as `logo.svg` (preferred) or `logo.png`.

- The header and the sign-in screen load `/brand/logo.svg` first, then `/brand/logo.png`.
- Until one of those files exists, the portal shows a neutral text placeholder, "HR Leave Portal".
- Swapping in the file needs no code change: rebuild (`npm --prefix ui run build`) and redeploy the UI stacks.
- Use a logo that reads well on the navy header; about 40 px tall is the displayed size.

This repository does not include or recreate the company's logo. Supply the file you are licensed to use.
