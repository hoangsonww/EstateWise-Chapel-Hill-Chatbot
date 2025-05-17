"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LIST_OF_MOCK_CLOUD_EVENT_PARTIALS = void 0;
const alerts_on_alert_published_1 = require("./alerts/alerts-on-alert-published");
const crashlytics_on_new_anr_issue_published_1 = require("./alerts/crashlytics-on-new-anr-issue-published");
const crashlytics_on_new_fatal_issue_published_1 = require("./alerts/crashlytics-on-new-fatal-issue-published");
const crashlytics_on_new_nonfatal_issue_published_1 = require("./alerts/crashlytics-on-new-nonfatal-issue-published");
const crashlytics_on_regression_alert_published_1 = require("./alerts/crashlytics-on-regression-alert-published");
const crashlytics_on_stability_digest_published_1 = require("./alerts/crashlytics-on-stability-digest-published");
const crashlytics_on_velocity_alert_published_1 = require("./alerts/crashlytics-on-velocity-alert-published");
const app_distribution_on_new_tester_ios_device_published_1 = require("./alerts/app-distribution-on-new-tester-ios-device-published");
const billing_on_plan_automated_update_published_1 = require("./alerts/billing-on-plan-automated-update-published");
const billing_on_plan_update_published_1 = require("./alerts/billing-on-plan-update-published");
const performance_on_threshold_alert_published_1 = require("./alerts/performance-on-threshold-alert-published");
const eventarc_on_custom_event_published_1 = require("./eventarc/eventarc-on-custom-event-published");
const pubsub_on_message_published_1 = require("./pubsub/pubsub-on-message-published");
const database_1 = require("./database");
const firestore_1 = require("./firestore");
const storage_1 = require("./storage");
const remote_config_on_config_updated_1 = require("./remoteconfig/remote-config-on-config-updated");
const test_lab_on_test_matrix_completed_1 = require("./testlab/test-lab-on-test-matrix-completed");
const firestore_on_document_created_with_auth_context_1 = require("./firestore/firestore-on-document-created-with-auth-context");
const firestore_on_document_deleted_with_auth_context_1 = require("./firestore/firestore-on-document-deleted-with-auth-context");
const firestore_on_document_updated_with_auth_context_1 = require("./firestore/firestore-on-document-updated-with-auth-context");
const firestore_on_document_written_with_auth_context_1 = require("./firestore/firestore-on-document-written-with-auth-context");
/**
 * Note: Ordering matters. Some MockEventPartials will match more generally
 * (eg {@link alertsOnAlertPublished}). In addition,
 * {@link eventarcOnCustomEventPublished} acts as a catch-all.
 */
exports.LIST_OF_MOCK_CLOUD_EVENT_PARTIALS = [
    crashlytics_on_new_anr_issue_published_1.alertsCrashlyticsOnNewAnrIssuePublished,
    crashlytics_on_new_fatal_issue_published_1.alertsCrashlyticsOnNewFatalIssuePublished,
    crashlytics_on_new_nonfatal_issue_published_1.alertsCrashlyticsOnNewNonfatalIssuePublished,
    crashlytics_on_regression_alert_published_1.alertsCrashlyticsOnRegressionAlertPublished,
    crashlytics_on_stability_digest_published_1.alertsCrashlyticsOnStabilityDigestPublished,
    crashlytics_on_velocity_alert_published_1.alertsCrashlyticsOnVelocityAlertPublished,
    app_distribution_on_new_tester_ios_device_published_1.alertsAppDistributionOnNewTesterIosDevicePublished,
    billing_on_plan_automated_update_published_1.alertsBillingOnPlanAutomatedUpdatePublished,
    billing_on_plan_update_published_1.alertsBillingOnPlanUpdatePublished,
    performance_on_threshold_alert_published_1.performanceThresholdOnThresholdAlertPublished,
    alerts_on_alert_published_1.alertsOnAlertPublished,
    remote_config_on_config_updated_1.remoteConfigOnConfigUpdated,
    test_lab_on_test_matrix_completed_1.testLabOnTestMatrixCompleted,
    storage_1.storageV1,
    pubsub_on_message_published_1.pubsubOnMessagePublished,
    database_1.databaseOnValueCreated,
    database_1.databaseOnValueDeleted,
    database_1.databaseOnValueUpdated,
    database_1.databaseOnValueWritten,
    firestore_1.firestoreOnDocumentCreated,
    firestore_1.firestoreOnDocumentDeleted,
    firestore_1.firestoreOnDocumentUpdated,
    firestore_1.firestoreOnDocumentWritten,
    firestore_on_document_created_with_auth_context_1.firestoreOnDocumentCreatedWithAuthContext,
    firestore_on_document_deleted_with_auth_context_1.firestoreOnDocumentDeletedWithAuthContext,
    firestore_on_document_updated_with_auth_context_1.firestoreOnDocumentUpdatedWithAuthContext,
    firestore_on_document_written_with_auth_context_1.firestoreOnDocumentWrittenWithAuthContext,
    // CustomEventPublished must be called last
    eventarc_on_custom_event_published_1.eventarcOnCustomEventPublished,
];
