{{- define "estatewise.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "estatewise.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name (include "estatewise.name" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}

{{- define "estatewise.namespace" -}}
{{- if .Values.global.namespace -}}
{{- .Values.global.namespace -}}
{{- else if .Values.namespace.name -}}
{{- .Values.namespace.name -}}
{{- else -}}
{{- .Release.Namespace -}}
{{- end -}}
{{- end -}}

{{- define "estatewise.labels" -}}
app.kubernetes.io/name: {{ include "estatewise.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: estatewise
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
{{- end -}}

{{- define "estatewise.componentName" -}}
{{- printf "%s-%s" (include "estatewise.fullname" .root) .component | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "estatewise.componentLabels" -}}
{{ include "estatewise.labels" .root }}
app.kubernetes.io/component: {{ .component }}
app: {{ include "estatewise.componentName" . }}
{{- end -}}

{{- define "estatewise.selectorLabels" -}}
app.kubernetes.io/name: {{ include "estatewise.name" .root }}
app.kubernetes.io/instance: {{ .root.Release.Name }}
app.kubernetes.io/component: {{ .component }}
app: {{ include "estatewise.componentName" . }}
{{- end -}}

{{- define "estatewise.image" -}}
{{- $registry := .Values.global.registry -}}
{{- if .image.registry -}}
{{- $registry = .image.registry -}}
{{- end -}}
{{- if $registry -}}
{{- printf "%s/%s:%s" $registry .image.repository .image.tag -}}
{{- else -}}
{{- printf "%s:%s" .image.repository .image.tag -}}
{{- end -}}
{{- end -}}

{{- define "estatewise.serviceAccountName" -}}
{{- if .Values.serviceAccount.create -}}
{{- if .Values.serviceAccount.name -}}
{{- .Values.serviceAccount.name -}}
{{- else -}}
{{- printf "%s-sa" (include "estatewise.fullname" .) -}}
{{- end -}}
{{- else -}}
{{- default "default" .Values.serviceAccount.name -}}
{{- end -}}
{{- end -}}

{{- define "estatewise.mergeAnnotations" -}}
{{- $result := dict -}}
{{- range $k, $v := .base }}
{{- $_ := set $result $k $v -}}
{{- end -}}
{{- range $k, $v := .extra }}
{{- $_ := set $result $k $v -}}
{{- end -}}
{{- toYaml $result -}}
{{- end -}}
