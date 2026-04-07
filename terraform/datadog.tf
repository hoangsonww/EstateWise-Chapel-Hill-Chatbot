# ─── Datadog Integration for EstateWise ──────────────────────────────────────
# Monitors, dashboards, SLOs, and synthetics for production observability.
#
# All resources are gated by local.dd_enabled so the Datadog provider is only
# exercised when enable_datadog = true AND a real API key is supplied.
# This lets the rest of the stack plan/apply without Datadog credentials.

locals {
  dd_tags    = ["env:production", "team:estatewise", "service:estatewise"]
  dd_notify  = join(" ", var.datadog_notification_channels)
  dd_enabled = var.enable_datadog && length(var.datadog_api_key) > 0
}

# ─── ECS Monitors ─────────────────────────────────────────────────────────────

resource "datadog_monitor" "ecs_high_cpu" {
  count = local.dd_enabled ? 1 : 0

  name    = "[EstateWise] ECS High CPU Utilization"
  type    = "metric alert"
  message = <<-EOT
    ECS service CPU utilization is elevated.
    - Warning  (>80%): investigate autoscaling and container right-sizing.
    - Critical (>95%): service is at risk of being throttled.
    ${local.dd_notify}
  EOT

  query = "avg(last_10m):avg:ecs.fargate.cpu.percent{cluster_name:estatewise-cluster,service_name:estatewise-backend-service} > 95"

  monitor_thresholds {
    warning  = 80
    critical = 95
  }

  notify_no_data      = false
  renotify_interval   = 30
  priority            = 2
  tags                = local.dd_tags
}

resource "datadog_monitor" "ecs_high_memory" {
  count = local.dd_enabled ? 1 : 0

  name    = "[EstateWise] ECS High Memory Utilization"
  type    = "metric alert"
  message = <<-EOT
    ECS service memory utilization is elevated.
    - Warning  (>85%): memory pressure detected, consider scaling out.
    - Critical (>95%): OOM risk – immediate action required.
    ${local.dd_notify}
  EOT

  query = "avg(last_10m):avg:ecs.fargate.mem.percent{cluster_name:estatewise-cluster,service_name:estatewise-backend-service} > 95"

  monitor_thresholds {
    warning  = 85
    critical = 95
  }

  notify_no_data      = false
  renotify_interval   = 30
  priority            = 2
  tags                = local.dd_tags
}

resource "datadog_monitor" "ecs_task_stopped" {
  count = local.dd_enabled ? 1 : 0

  name    = "[EstateWise] ECS Task Stopped Unexpectedly"
  type    = "event alert"
  message = <<-EOT
    An ECS task in the estatewise-backend-service has stopped unexpectedly.
    Check the ECS console and CloudWatch logs at /ecs/estatewise/backend for the stop reason.
    ${local.dd_notify}
  EOT

  query = "events('sources:ecs tags:service:estatewise-backend-service,status:error').rollup('count').last('5m') > 0"

  monitor_thresholds {
    critical = 0
  }

  notify_no_data    = false
  renotify_interval = 0
  priority          = 1
  tags              = local.dd_tags
}

resource "datadog_monitor" "ecs_service_running_tasks" {
  count = local.dd_enabled ? 1 : 0

  name    = "[EstateWise] ECS Running Task Count Below Desired"
  type    = "metric alert"
  message = <<-EOT
    The number of running ECS tasks has dropped below the desired count for 5 minutes.
    Check the ECS service events and CloudWatch logs at /ecs/estatewise/backend.
    ${local.dd_notify}
  EOT

  query = "min(last_5m):aws.ecs.service.running{servicename:estatewise-backend-service,clustername:estatewise-cluster} < ${var.desired_count}"

  monitor_thresholds {
    critical = var.desired_count
  }

  notify_no_data      = true
  no_data_timeframe   = 10
  renotify_interval   = 15
  priority            = 1
  tags                = local.dd_tags
}

# ─── ALB Monitors ─────────────────────────────────────────────────────────────

resource "datadog_monitor" "alb_5xx_rate" {
  count = local.dd_enabled ? 1 : 0

  name    = "[EstateWise] ALB 5xx Error Rate Elevated"
  type    = "metric alert"
  message = <<-EOT
    The ALB is returning an elevated rate of 5xx errors (> 5% of requests over the last 5 minutes).
    This indicates backend service failures. Check application logs and ECS task health.
    ${local.dd_notify}
  EOT

  query = "sum(last_5m):sum:aws.applicationelb.httpcode_target_5xx{name:estatewise-alb}.as_rate() / sum:aws.applicationelb.request_count{name:estatewise-alb}.as_rate() * 100 > 5"

  monitor_thresholds {
    critical = 5
  }

  notify_no_data    = false
  renotify_interval = 15
  priority          = 1
  tags              = local.dd_tags
}

resource "datadog_monitor" "alb_latency_p95" {
  count = local.dd_enabled ? 1 : 0

  name    = "[EstateWise] ALB Target Response Time P95 Elevated"
  type    = "metric alert"
  message = <<-EOT
    ALB target response time P95 is elevated.
    - Warning  (>500ms): performance degradation detected.
    - Critical (>1s): users are experiencing significant latency.
    Check slow query logs and APM traces.
    ${local.dd_notify}
  EOT

  query = "avg(last_5m):p95:aws.applicationelb.target_response_time{name:estatewise-alb} > 1"

  monitor_thresholds {
    warning  = 0.5
    critical = 1
  }

  notify_no_data    = false
  renotify_interval = 15
  priority          = 2
  tags              = local.dd_tags
}

resource "datadog_monitor" "alb_healthy_hosts" {
  count = local.dd_enabled ? 1 : 0

  name    = "[EstateWise] ALB Healthy Host Count Below Desired"
  type    = "metric alert"
  message = <<-EOT
    The number of healthy hosts registered to the ALB target group has fallen below the desired task count.
    This means traffic is being served by fewer than expected instances.
    Check ECS task health and ALB health check configuration.
    ${local.dd_notify}
  EOT

  query = "min(last_5m):aws.applicationelb.healthy_host_count{name:estatewise-alb} < ${var.desired_count}"

  monitor_thresholds {
    critical = var.desired_count
  }

  notify_no_data      = true
  no_data_timeframe   = 10
  renotify_interval   = 15
  priority            = 1
  tags                = local.dd_tags
}

# ─── Log & APM Monitors ───────────────────────────────────────────────────────

resource "datadog_monitor" "log_error_anomaly" {
  count = local.dd_enabled ? 1 : 0

  name    = "[EstateWise] Anomalous Error Log Volume Detected"
  type    = "log alert"
  message = <<-EOT
    The volume of ERROR-level log entries from /ecs/estatewise/backend is behaving anomalously.
    This may indicate a new bug, a configuration change, or a failing dependency.
    Review recent deployments and inspect CloudWatch Logs Insights.
    ${local.dd_notify}
  EOT

  query = "logs(\"source:aws service:estatewise status:error\").index(\"*\").rollup(\"count\").by(\"service\").last(\"15m\") > 0"

  monitor_thresholds {
    warning  = 10
    critical = 50
  }

  notify_no_data    = false
  renotify_interval = 60
  priority          = 3
  tags              = local.dd_tags
}

resource "datadog_monitor" "apm_error_rate" {
  count = local.dd_enabled ? 1 : 0

  name    = "[EstateWise] APM Service Error Rate Elevated"
  type    = "metric alert"
  message = <<-EOT
    The APM-reported error rate for the estatewise backend service has exceeded 5%.
    Check the APM Service page for failing endpoints and correlated traces.
    ${local.dd_notify}
  EOT

  query = "sum(last_5m):sum:trace.express.request.errors{service:estatewise-backend}.as_rate() / sum:trace.express.request.hits{service:estatewise-backend}.as_rate() * 100 > 5"

  monitor_thresholds {
    warning  = 2
    critical = 5
  }

  notify_no_data    = false
  renotify_interval = 15
  priority          = 2
  tags              = local.dd_tags
}

resource "datadog_monitor" "apm_latency_p99" {
  count = local.dd_enabled ? 1 : 0

  name    = "[EstateWise] APM P99 Latency Exceeds Threshold"
  type    = "metric alert"
  message = <<-EOT
    APM P99 latency for the estatewise backend service has exceeded 2 seconds.
    This indicates that the tail of the latency distribution is severely degraded.
    Check slow traces in the APM trace explorer.
    ${local.dd_notify}
  EOT

  query = "avg(last_5m):p99:trace.express.request{service:estatewise-backend} > 2"

  monitor_thresholds {
    warning  = 1
    critical = 2
  }

  notify_no_data    = false
  renotify_interval = 15
  priority          = 1
  tags              = local.dd_tags
}

# ─── Dashboard ────────────────────────────────────────────────────────────────

resource "datadog_dashboard" "main" {
  count = local.dd_enabled ? 1 : 0

  title        = "EstateWise Production Overview"
  description  = "Unified production observability dashboard for the EstateWise platform (ECS Fargate + ALB + Logs + APM)."
  layout_type  = "ordered"
  is_read_only = false
  tags         = local.dd_tags

  # ── Widget Group: Infrastructure ──────────────────────────────────────────
  widget {
    group_definition {
      title       = "Infrastructure — ECS Fargate"
      layout_type = "ordered"

      widget {
        timeseries_definition {
          title = "ECS CPU Utilization %"
          request {
            q            = "avg:ecs.fargate.cpu.percent{cluster_name:estatewise-cluster,service_name:estatewise-backend-service}"
            display_type = "line"
            style {
              palette    = "dog_classic"
              line_type  = "solid"
              line_width = "normal"
            }
          }
          yaxis {
            min = "0"
            max = "100"
          }
        }
      }

      widget {
        timeseries_definition {
          title = "ECS Memory Utilization %"
          request {
            q            = "avg:ecs.fargate.mem.percent{cluster_name:estatewise-cluster,service_name:estatewise-backend-service}"
            display_type = "line"
            style {
              palette    = "warm"
              line_type  = "solid"
              line_width = "normal"
            }
          }
          yaxis {
            min = "0"
            max = "100"
          }
        }
      }

      widget {
        query_value_definition {
          title      = "Running Tasks"
          autoscale  = true
          precision  = 0
          request {
            q          = "avg:aws.ecs.service.running{servicename:estatewise-backend-service,clustername:estatewise-cluster}"
            aggregator = "last"
          }
        }
      }

      widget {
        timeseries_definition {
          title = "Running vs Desired Tasks"
          request {
            q            = "avg:aws.ecs.service.running{servicename:estatewise-backend-service,clustername:estatewise-cluster}"
            display_type = "bars"
            style {
              palette = "cool"
            }
          }
          request {
            q            = "avg:aws.ecs.service.desired{servicename:estatewise-backend-service,clustername:estatewise-cluster}"
            display_type = "line"
            style {
              palette    = "grey"
              line_type  = "dashed"
              line_width = "thin"
            }
          }
        }
      }
    }
  }

  # ── Widget Group: Application ──────────────────────────────────────────────
  widget {
    group_definition {
      title       = "Application — Request Metrics"
      layout_type = "ordered"

      widget {
        timeseries_definition {
          title = "Request Rate (req/s)"
          request {
            q            = "sum:trace.express.request.hits{service:estatewise-backend}.as_rate()"
            display_type = "line"
            style {
              palette = "dog_classic"
            }
          }
        }
      }

      widget {
        timeseries_definition {
          title = "Error Rate %"
          request {
            q            = "sum:trace.express.request.errors{service:estatewise-backend}.as_rate() / sum:trace.express.request.hits{service:estatewise-backend}.as_rate() * 100"
            display_type = "line"
            style {
              palette = "warm"
            }
          }
          yaxis {
            min = "0"
          }
        }
      }

      widget {
        timeseries_definition {
          title = "Latency P50 / P95 / P99 (ms)"
          request {
            q            = "p50:trace.express.request{service:estatewise-backend} * 1000"
            display_type = "line"
            style {
              palette    = "cool"
              line_width = "thin"
            }
          }
          request {
            q            = "p95:trace.express.request{service:estatewise-backend} * 1000"
            display_type = "line"
            style {
              palette    = "purple"
              line_width = "normal"
            }
          }
          request {
            q            = "p99:trace.express.request{service:estatewise-backend} * 1000"
            display_type = "line"
            style {
              palette    = "orange"
              line_width = "thick"
            }
          }
          yaxis {
            min = "0"
          }
        }
      }
    }
  }

  # ── Widget Group: ALB ──────────────────────────────────────────────────────
  widget {
    group_definition {
      title       = "ALB — Load Balancer Metrics"
      layout_type = "ordered"

      widget {
        timeseries_definition {
          title = "HTTP Response Codes (2xx / 4xx / 5xx)"
          request {
            q            = "sum:aws.applicationelb.httpcode_target_2xx{name:estatewise-alb}.as_rate()"
            display_type = "bars"
            style {
              palette = "green"
            }
          }
          request {
            q            = "sum:aws.applicationelb.httpcode_target_4xx{name:estatewise-alb}.as_rate()"
            display_type = "bars"
            style {
              palette = "yellow"
            }
          }
          request {
            q            = "sum:aws.applicationelb.httpcode_target_5xx{name:estatewise-alb}.as_rate()"
            display_type = "bars"
            style {
              palette = "red"
            }
          }
        }
      }

      widget {
        timeseries_definition {
          title = "Target Response Time P95 (s)"
          request {
            q            = "p95:aws.applicationelb.target_response_time{name:estatewise-alb}"
            display_type = "line"
            style {
              palette = "purple"
            }
          }
          markers {
            value        = "y = 0.5"
            display_type = "warning dashed"
            label        = "Warning 500ms"
          }
          markers {
            value        = "y = 1"
            display_type = "error dashed"
            label        = "Critical 1s"
          }
        }
      }

      widget {
        timeseries_definition {
          title = "Active Connections"
          request {
            q            = "sum:aws.applicationelb.active_connection_count{name:estatewise-alb}"
            display_type = "line"
            style {
              palette = "dog_classic"
            }
          }
        }
      }

      widget {
        query_value_definition {
          title     = "Healthy Host Count"
          autoscale = true
          precision = 0
          request {
            q          = "avg:aws.applicationelb.healthy_host_count{name:estatewise-alb}"
            aggregator = "last"
          }
        }
      }
    }
  }

  # ── Widget Group: Logs ─────────────────────────────────────────────────────
  widget {
    group_definition {
      title       = "Logs — /ecs/estatewise/backend"
      layout_type = "ordered"

      widget {
        timeseries_definition {
          title = "Error Log Volume Over Time"
          request {
            log_query {
              index = "*"
              compute {
                aggregation = "count"
              }
              search {
                query = "source:aws service:estatewise status:error"
              }
              group_by {
                facet = "service"
                sort {
                  aggregation = "count"
                  order       = "desc"
                }
                limit = 10
              }
            }
            display_type = "bars"
            style {
              palette = "red"
            }
          }
        }
      }

      widget {
        toplist_definition {
          title = "Top Error Patterns"
          request {
            log_query {
              index = "*"
              compute {
                aggregation = "count"
              }
              search {
                query = "source:aws service:estatewise status:error"
              }
              group_by {
                facet = "message"
                sort {
                  aggregation = "count"
                  order       = "desc"
                }
                limit = 10
              }
            }
          }
        }
      }
    }
  }

  # ── Widget Group: Database ─────────────────────────────────────────────────
  widget {
    group_definition {
      title       = "Database — MongoDB"
      layout_type = "ordered"

      widget {
        timeseries_definition {
          title = "MongoDB Active Connections"
          request {
            q            = "avg:mongodb.connections.current{service:estatewise-backend}"
            display_type = "line"
            style {
              palette = "dog_classic"
            }
          }
        }
      }

      widget {
        timeseries_definition {
          title = "MongoDB Query Latency (ms)"
          request {
            q            = "avg:mongodb.oplatencies.reads.latency{service:estatewise-backend}"
            display_type = "line"
            style {
              palette    = "cool"
              line_width = "normal"
            }
          }
          request {
            q            = "avg:mongodb.oplatencies.writes.latency{service:estatewise-backend}"
            display_type = "line"
            style {
              palette    = "warm"
              line_width = "normal"
            }
          }
          yaxis {
            min = "0"
          }
        }
      }
    }
  }
}

# ─── Service Level Objectives ─────────────────────────────────────────────────

resource "datadog_service_level_objective" "api_availability" {
  count = local.dd_enabled ? 1 : 0

  name        = "EstateWise API Availability"
  type        = "metric"
  description = "99.9% of all requests to the EstateWise ALB must return non-5xx responses over any rolling 30-day window."
  tags        = local.dd_tags

  thresholds {
    timeframe       = "30d"
    target          = 99.9
    warning         = 99.95
    target_display  = "99.9"
    warning_display = "99.95"
  }

  query {
    # Good events: total requests minus 5xx errors
    numerator   = "sum:aws.applicationelb.request_count{name:estatewise-alb}.as_count() - sum:aws.applicationelb.httpcode_target_5xx{name:estatewise-alb}.as_count()"
    denominator = "sum:aws.applicationelb.request_count{name:estatewise-alb}.as_count()"
  }
}

resource "datadog_service_level_objective" "api_latency" {
  count = local.dd_enabled ? 1 : 0

  name        = "EstateWise API Latency SLO"
  type        = "metric"
  description = "95% of requests to the EstateWise ALB must complete within 500ms over any rolling 30-day window."
  tags        = local.dd_tags

  thresholds {
    timeframe       = "30d"
    target          = 95.0
    warning         = 97.0
    target_display  = "95"
    warning_display = "97"
  }

  query {
    # Good events: requests whose target response time was at or under 500ms
    numerator   = "sum:aws.applicationelb.request_count{name:estatewise-alb,target_response_time_bucket:[0,0.5]}.as_count()"
    denominator = "sum:aws.applicationelb.request_count{name:estatewise-alb}.as_count()"
  }
}

# ─── Synthetics ───────────────────────────────────────────────────────────────

resource "datadog_synthetics_test" "health_check" {
  count = local.dd_enabled ? 1 : 0

  name      = "EstateWise Backend Health Check"
  type      = "api"
  subtype   = "http"
  status    = "live"
  message   = "EstateWise backend health endpoint is not responding as expected. ${local.dd_notify}"
  tags      = local.dd_tags
  locations = ["aws:us-east-1", "aws:us-west-2", "aws:eu-west-1"]

  request_definition {
    method = "GET"
    url    = "http://${aws_lb.alb.dns_name}/health"
  }

  request_headers = {
    Content-Type = "application/json"
  }

  assertion {
    type     = "statusCode"
    operator = "is"
    target   = "200"
  }

  assertion {
    type     = "responseTime"
    operator = "lessThan"
    target   = "2000"
  }

  options_list {
    tick_every           = 60
    follow_redirects     = true
    min_failure_duration = 0
    min_location_failed  = 1
    retry {
      count    = 1
      interval = 300
    }
  }
}

# ─── Downtime / Maintenance Windows ──────────────────────────────────────────

variable "datadog_maintenance_windows" {
  description = "Recurring maintenance windows that suppress monitor notifications"
  type = list(object({
    scope    = list(string)
    start    = string   # ISO 8601 or cron-style (handled externally)
    end      = string
    timezone = string
    message  = string
  }))
  default = []
}

resource "datadog_downtime_schedule" "planned_maintenance" {
  count = local.dd_enabled && length(var.datadog_maintenance_windows) > 0 ? length(var.datadog_maintenance_windows) : 0

  scope = join(",", var.datadog_maintenance_windows[count.index].scope)

  recurring_schedule {
    timezone   = var.datadog_maintenance_windows[count.index].timezone
    recurrence {
      type      = "weeks"
      period    = 1
      start     = var.datadog_maintenance_windows[count.index].start
      duration  = var.datadog_maintenance_windows[count.index].end
    }
  }

  display_timezone = var.datadog_maintenance_windows[count.index].timezone
  message          = var.datadog_maintenance_windows[count.index].message
  notify_end_types = ["canceled", "expired"]
  notify_end_states = ["alert", "warn", "no data"]

  monitor_identifier {
    monitor_tags = local.dd_tags
  }
}

# On-demand deployment downtime — triggered by deployment-control before
# scheduled releases. Creates a 30-minute window by default.

variable "datadog_deploy_downtime_duration_minutes" {
  description = "Duration of deployment downtime window in minutes"
  type        = number
  default     = 30
}
