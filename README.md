# Geo Symbology calc

**Problem statement**

Ona worked with ODK to develop a geowidget enabling data collectors to select a facility from a map view. Ona also further developed the feature on their platform allowing a user to develop a GeoJSON from form data already on the platform. The current solution uses two forms: (1) new facility registration form and (2) a health facility visit form. The new facility registration generates the GeoJSON for the health facility visit form. However, the health facility visit form determines the priority and coloring (i.e. green meaning no visit is required or red meaning a visit is required). Therefore, the new facility registration form would need to be updated manually weekly, taking about 40 minutes to 1 hour per country.

**the problem**

Updating the new facility registration form data manually is not ideal. This would require WHO to assign someone to update 45 countries manually once a week.

** Proposed Solution**

This app attempts at automating the task above. Its able to:

- Download data from the health facility visit form and, possibly, the new facility registration form
- Get the visit dates from the health facility visit form. Use this to calculate the visit prioritization based on logic provided by WHO.
- Update the status on an updated version of the facility registration form (eg. we will add a prioritization field). This prioritization status can then be used to define what color the facility should show up on the map.

## What's inside?

This turborepo uses [Yarn](https://yarnpkg.com/) as a package manager. It includes the following packages/apps:

### Apps and Packages

- `web`: a web-based GUI interface
- `core`: util that is able to pull form data and evaluates it according to configured business rules.
- `eslint-config-custom`: `eslint` configurations (includes `eslint-config-next` and `eslint-config-prettier`)
- `tsconfig`: `tsconfig.json`s used throughout the monorepo

### Build

To build all apps and packages, run the following command:

```shell
# in root dir
yarn install
yarn build

# you can then preview the production build by
yarn preview
```

#### Run with docker

```shell
docker compose up
```

### Develop

To develop all apps and packages, run the following command:

```shell
# in root dir
yarn install
yarn dev
```

### Testing

To run all the tests

```
yarn test
```

Filter tests by directory

```
yarn test --filter=./packages/*
```

### Configuration

The web app's configs are stored in the `apps/web/config` directory. There is a `default.json` file that you can use as a template. You can copy to a `local.json` file, modify the values to your liking and Run the app. [Read more](/apps/web/README.md#envs-and-configuration)
