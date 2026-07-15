# Serves the static TapListBuilder site via nginx.
#
# Assumes this Dockerfile sits next to index.html (i.e. at the repo root, or wherever
# index.html/css/js/data/assets live). If your site is instead checked in under a
# subfolder (e.g. a "TapListBuilder/" folder inside the repo), change the COPY line
# below to `COPY TapListBuilder/ /usr/share/nginx/html/`.
FROM nginx:1.27-alpine

ARG APP_VERSION=dev
ARG BUILD_DATE
ARG VCS_REF=unknown
LABEL org.opencontainers.image.title="TapListBuilder" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${VCS_REF}"

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY . /usr/share/nginx/html/

# Overwrite the placeholder version.json with the real values for this build, so the
# in-app About dialog (Help -> About) can show the actual tag/commit/build date.
RUN printf '{"version":"%s","sha":"%s","buildDate":"%s"}' "${APP_VERSION}" "${VCS_REF}" "${BUILD_DATE}" > /usr/share/nginx/html/version.json

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost/ || exit 1
