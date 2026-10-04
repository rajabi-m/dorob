FROM node:22.20.0-bookworm-slim
WORKDIR /app
# Dashboard 1.10.0 and pg-boss 12.35.0 both use schema version 43.
RUN npm install --omit=dev --save-exact @pg-boss/dashboard@1.10.0
USER node
EXPOSE 3000
CMD ["sh", "-c", "test -n \"$PGBOSS_DASHBOARD_AUTH_USERNAME\" && test -n \"$PGBOSS_DASHBOARD_AUTH_PASSWORD\" && exec node node_modules/@pg-boss/dashboard/build/server.js"]
