# QBar web demo

A small browser demo for rendering scale ticks from a probability distribution rather than from a fixed linear grid.

**Live demo:** https://khoda81.github.io/qbar/

The experiment works in quantile space: candidate tick positions come from a distribution's inverse CDF, while local spacing and density determine which labels remain visually useful at the current scale. The demo includes numerical implementations for several distributions and lets you interactively tune the minimum tick spacing and opacity drop-off.

## Bayesian inference lab

`bayes.html` is an interactive Gaussian inference playground over `(u, log v)`. Click the posterior-predictive plot to add observations, then switch between computational representations of the same posterior:

- deliberately naive reference grid
- exact sufficient-statistic grid
- exact analytic marginalization of `u`
- full-covariance Laplace approximation
- diagonal Laplace approximation

The lab reports measured inference time, posterior KL and predictive KL against the reference implementation, visualizes approximation error in parameter space, and renders both the reference and selected predictive distributions through the QBar probability-coordinate tick representation.

## Included distributions

The current standalone implementation includes quantile/PDF helpers for distributions such as:

- Normal
- Exponential
- Uniform
- Logistic
- Beta

## Run locally

There is no build step:

```bash
git clone https://github.com/khoda81/qbar-web.git
cd qbar-web
```

Open `index.html` in a browser. The Bayesian lab is at `bayes.html`.

## Why this exists

Traditional axes choose "nice" values in data coordinates. QBar explores the complementary idea of choosing visual structure in **probability coordinates**, so the display can devote resolution to regions where a distribution says distinctions matter.
