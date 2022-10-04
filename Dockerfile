FROM node:18-alpine AS build

WORKDIR /build
COPY . .
RUN yarn install --immutable && yarn build && yarn prod-install /app
RUN cp -r dist /app

FROM node:18-alpine
WORKDIR /app
COPY --from=build /app .

EXPOSE 3000
CMD ["yarn", "start"]
