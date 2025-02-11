/**
 * Copyright (c) 2019-2021 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import * as Listr from 'listr'
import * as path from 'path'
import { CheHelper } from '../../api/che'
import { KubeHelper } from '../../api/kube'
import {
  DEVFILE_WORKSPACE_API_GROUP,
  DEVFILE_WORKSPACE_API_VERSION,
  DEVWORKSPACES_KIND_PLURAL,
  DEVFILE_CONTROLLER_API_GROUP,
  DEVWORKSPACEROUTINGS_KIND_PLURAL,
  DEVFILE_CONTROLLER_API_VERSION, DEVWORKSPACETEMPLATES_KIND_PLURAL,
  WORKSPACE_CONTROLLER_NAMESPACE, DEVWORKSPACEOPERATORCONFIGS_KIND_PLURAL,
} from '../../constants'
import { ChectlContext } from '../../api/context'
import { createNamespaceTask } from '../installers/common-tasks'

/**
 * Handle setup of the dev workspace operator controller.
 */
export class DevWorkspaceTasks {
  protected kubeHelper: KubeHelper
  protected cheHelper: CheHelper

  // ServiceAccounts
  protected devWorkspaceSAName = 'devworkspace-controller-serviceaccount'
  protected webhookServerSAName = 'devworkspace-webhook-server'

  // Roles and RoleBindings
  protected devWorkspaceLeaderElectionRoleName = 'devworkspace-controller-leader-election-role'
  protected devWorkspaceLeaderElectionRoleBindingName = 'devworkspace-controller-leader-election-rolebinding'
  protected devWorkspaceServiceCertRoleName = 'devworkspace-controller-manager-service-cert'
  protected devWorkspaceServiceCertRoleBindingName = 'devworkspace-controller-manager-service-cert'

  // ClusterRoles and ClusterRoleBindings
  protected devWorkspaceEditWorkspaceClusterRoleName = 'devworkspace-controller-edit-workspaces'
  protected devWorkspaceProxyClusterRoleName = 'devworkspace-controller-proxy-role'
  protected devWorkspaceClusterRoleName = 'devworkspace-controller-role'
  protected devWorkspaceMetricsReaderClusterRoleName = 'devworkspace-controller-metrics-reader'
  protected devWorkspaceViewWorkspaceClusterRoleName = 'devworkspace-controller-view-workspaces'
  protected devWorkspaceProxyClusterRoleBindingName = 'devworkspace-controller-proxy-rolebinding'
  protected devWorkspaceClusterRoleBindingName = 'devworkspace-controller-rolebinding'
  protected webhookServerClusterRoleName = 'devworkspace-webhook-server'
  protected webhookServerClusterRoleBindingName = 'devworkspace-webhook-server'

  // Issuer
  protected devWorkspaceCertificateName = 'devworkspace-controller-serving-cert'
  protected devWorkspaceIssuerName = 'devworkspace-controller-selfsigned-issuer'

  // Secrets
  protected webhookCertSecretName = 'devworkspace-operator-webhook-cert'
  protected devWorkspaceCertSecretName = 'devworkspace-controller-manager-service-cert'
  protected webhookTlsSecretName = 'devworkspace-webhookserver-tls'

  // DevWorkspace CRD Names
  protected devWorkspacesCrdName = 'devworkspaces.workspace.devfile.io'
  protected devWorkspaceTemplatesCrdName = 'devworkspacetemplates.workspace.devfile.io'
  protected devWorkspaceRoutingsCrdName = 'devworkspaceroutings.controller.devfile.io'
  protected devWorkspaceConfigCrdName = 'devworkspaceoperatorconfigs.controller.devfile.io'

  // Deployments
  protected webhookServerDeploymentName = 'devworkspace-webhook-server'
  protected devWorkspaceControllerManagerDeploymentName = 'devworkspace-controller-manager'

  // Services
  protected webhookServiceName = 'devworkspace-webhookserver'
  protected devWorkspaceMetricsServiceName = 'devworkspace-controller-metrics'
  protected devWorkspaceManagerServiceName = 'devworkspace-controller-manager-service'

  // DevWorkspace webhook
  protected webhookConfigurationName = 'controller.devfile.io'

  // DevWorkspace configuration
  protected devWorkspaceOperatorConfig = 'devworkspace-operator-config'

  protected skip: boolean

  constructor(flags: any) {
    this.kubeHelper = new KubeHelper(flags)
    this.cheHelper = new CheHelper(flags)
    this.skip = flags['skip-devworkspace-operator']
  }

  getInstallTasks(): ReadonlyArray<Listr.ListrTask> {
    return [
      {
        title: 'Install Dev Workspace operator',
        skip: () => this.skip,
        task: async (ctx: any, _task: any) => {
          const tasks = new Listr(undefined, ctx.listrOptions)
          tasks.add(createNamespaceTask(WORKSPACE_CONTROLLER_NAMESPACE, {}))
          tasks.add({
            title: 'Create Dev Workspace operator resources',
            task: async (ctx: any, task: any) => {
              await this.kubeHelper.applyResource(`${path.normalize(ctx[ChectlContext.DEVWORKAPCE_OPERATOR_RESOURCES])}/kubernetes/combined.yaml`)
              task.title = `${task.title}...[OK]`
            },
          })
          tasks.add({
            title: 'Wait for Dev Workspace operator',
            task: async (ctx: any, task: any) => {
              await this.kubeHelper.waitForPodReady('app.kubernetes.io/name=devworkspace-controller', WORKSPACE_CONTROLLER_NAMESPACE)
              await this.kubeHelper.waitForPodReady('app.kubernetes.io/name=devworkspace-webhook-server', WORKSPACE_CONTROLLER_NAMESPACE)
              task.title = `${task.title}...[OK]`
            },
          })
          return tasks
        },
      },
    ]
  }

  getUpdateTasks(): ReadonlyArray<Listr.ListrTask> {
    return [
      {
        title: 'Update Dev Workspace operator',
        skip: () => this.skip,
        task: async (ctx: any, _task: any) => {
          const tasks = new Listr(undefined, ctx.listrOptions)
          tasks.add({
            title: 'Update Dev Workspace operator resources',
            task: async (ctx: any, task: any) => {
              await this.kubeHelper.applyResource(`${path.normalize(ctx[ChectlContext.DEVWORKAPCE_OPERATOR_RESOURCES])}/kubernetes/combined.yaml`)
              task.title = `${task.title}...[OK]`
            },
          })
          tasks.add({
            title: 'Wait for Dev Workspace operator',
            task: async (ctx: any, task: any) => {
              await this.kubeHelper.waitForPodReady('app.kubernetes.io/name=devworkspace-controller', WORKSPACE_CONTROLLER_NAMESPACE)
              await this.kubeHelper.waitForPodReady('app.kubernetes.io/name=devworkspace-webhook-server', WORKSPACE_CONTROLLER_NAMESPACE)
              task.title = `${task.title}...[OK]`
            },
          })
          return tasks
        },
      },
    ]
  }

  createOrUpdateDevWorkspaceOperatorConfigTasks(): ReadonlyArray<Listr.ListrTask> {
    return [
      {
        title: 'Create DevWorkspaceOperatorConfig',
        task: async (_ctx: any, task: any) => {
          const devWorkspaceOperatorConfig = {
            apiVersion: 'controller.devfile.io/v1alpha1',
            kind: 'DevWorkspaceOperatorConfig',
            metadata: {
              name: this.devWorkspaceOperatorConfig,
            },
            config: {
              workspace: {
                progressTimeout: '30m',
              },
            },
          }

          const operatorConfig = await this.kubeHelper.getCustomResource(this.devWorkspaceOperatorConfig, WORKSPACE_CONTROLLER_NAMESPACE, 'controller.devfile.io', 'v1alpha1', 'devworkspaceoperatorconfigs')
          if (!operatorConfig) {
            await this.kubeHelper.createDevWorkspaceOperatorConfig(devWorkspaceOperatorConfig, WORKSPACE_CONTROLLER_NAMESPACE)
            task.title = `${task.title} ...[Ok: created]`
          } else {
            await this.kubeHelper.patchDevWorkspaceOperatorConfig(this.devWorkspaceOperatorConfig, WORKSPACE_CONTROLLER_NAMESPACE, devWorkspaceOperatorConfig)
            task.title = `${task.title} ...[Ok: updated]`
          }
        },
      },
    ]
  }

  getDeleteTasks(devWorkspaceNamespace: string): ReadonlyArray<Listr.ListrTask> {
    return [
      {
        title: 'Delete cluster scope objects',
        task: async (_ctx: any, task: any) => {
          try {
            await this.kubeHelper.deleteMutatingWebhookConfiguration(this.webhookConfigurationName)
            await this.kubeHelper.deleteValidatingWebhookConfiguration(this.webhookConfigurationName)
            task.title = `${task.title}...[Ok]`
          } catch (e: any) {
            task.title = `${task.title}...[Failed: ${e.message}]`
          }
        },
      },
      {
        title: `Delete ${DEVWORKSPACES_KIND_PLURAL}.${DEVFILE_WORKSPACE_API_GROUP} resources`,
        task: async (_ctx: any, task: any) => {
          try {
            await this.kubeHelper.deleteAllCustomResourcesAndCrd(this.devWorkspacesCrdName,
              DEVFILE_WORKSPACE_API_GROUP,
              DEVFILE_WORKSPACE_API_VERSION,
              DEVWORKSPACES_KIND_PLURAL)
            task.title = `${task.title}...[Ok]`
          } catch (e: any) {
            task.title = `${task.title}...[Failed: ${e.message}]`
          }
        },
      },
      {
        title: `Delete ${DEVWORKSPACETEMPLATES_KIND_PLURAL}.${DEVFILE_WORKSPACE_API_GROUP} resources`,
        task: async (_ctx: any, task: any) => {
          try {
            await this.kubeHelper.deleteAllCustomResourcesAndCrd(this.devWorkspaceTemplatesCrdName,
              DEVFILE_WORKSPACE_API_GROUP,
              DEVFILE_WORKSPACE_API_VERSION,
              DEVWORKSPACETEMPLATES_KIND_PLURAL)
            task.title = `${task.title}...[Ok]`
          } catch (e: any) {
            task.title = `${task.title}...[Failed: ${e.message}]`
          }
        },
      },
      {
        title: `Delete ${DEVWORKSPACEROUTINGS_KIND_PLURAL}.${DEVFILE_CONTROLLER_API_GROUP} resources`,
        task: async (_ctx: any, task: any) => {
          try {
            await this.kubeHelper.deleteAllCustomResourcesAndCrd(this.devWorkspaceRoutingsCrdName,
              DEVFILE_CONTROLLER_API_GROUP,
              DEVFILE_CONTROLLER_API_VERSION,
              DEVWORKSPACEROUTINGS_KIND_PLURAL)
            task.title = `${task.title}...[Ok]`
          } catch (e: any) {
            task.title = `${task.title}...[Failed: ${e.message}]`
          }
        },
      },
      {
        title: `Delete ${DEVWORKSPACEOPERATORCONFIGS_KIND_PLURAL}.${DEVFILE_CONTROLLER_API_GROUP} resources`,
        task: async (_ctx: any, task: any) => {
          try {
            await this.kubeHelper.deleteAllCustomResourcesAndCrd(this.devWorkspaceConfigCrdName,
              DEVFILE_CONTROLLER_API_GROUP,
              DEVFILE_CONTROLLER_API_VERSION,
              DEVWORKSPACEOPERATORCONFIGS_KIND_PLURAL)
            task.title = `${task.title}...[Ok]`
          } catch (e: any) {
            task.title = `${task.title}...[Failed: ${e.message}]`
          }
        },
      },
      {
        title: 'Delete Networks',
        task: async (ctx: any, task: any) => {
          try {
            if (!ctx[ChectlContext.IS_OPENSHIFT]) {
              await this.kubeHelper.deleteService(this.devWorkspaceManagerServiceName, devWorkspaceNamespace)
              await this.kubeHelper.deleteService(this.devWorkspaceMetricsServiceName, devWorkspaceNamespace)
            }
            await this.kubeHelper.deleteService(this.webhookServiceName, devWorkspaceNamespace)
            task.title = `${task.title}...[Ok]`
          } catch (e: any) {
            task.title = `${task.title}...[Failed: ${e.message}]`
          }
        },
      },
      {
        title: 'Delete Workloads',
        task: async (ctx: any, task: any) => {
          try {
            if (!ctx[ChectlContext.IS_OPENSHIFT]) {
              await this.kubeHelper.deleteDeployment(this.devWorkspaceControllerManagerDeploymentName, devWorkspaceNamespace)
              await this.kubeHelper.deleteSecret(this.webhookCertSecretName, devWorkspaceNamespace)
              await this.kubeHelper.deleteSecret(this.devWorkspaceCertSecretName, devWorkspaceNamespace)
            }
            await this.kubeHelper.deleteDeployment(this.webhookServerDeploymentName, devWorkspaceNamespace)
            await this.kubeHelper.deleteSecret(this.webhookTlsSecretName, devWorkspaceNamespace)
            task.title = `${task.title}...[Ok]`
          } catch (e: any) {
            task.title = `${task.title}...[Failed: ${e.message}]`
          }
        },
      },
      {
        title: 'Delete RBAC',
        task: async (ctx: any, task: any) => {
          try {
            await this.kubeHelper.deleteRole(this.devWorkspaceLeaderElectionRoleName, devWorkspaceNamespace)
            await this.kubeHelper.deleteRoleBinding(this.devWorkspaceLeaderElectionRoleBindingName, devWorkspaceNamespace)
            await this.kubeHelper.deleteRoleBinding(this.devWorkspaceServiceCertRoleName, devWorkspaceNamespace)
            await this.kubeHelper.deleteRoleBinding(this.devWorkspaceServiceCertRoleBindingName, devWorkspaceNamespace)

            await this.kubeHelper.deleteClusterRoleBinding(this.devWorkspaceClusterRoleBindingName)
            await this.kubeHelper.deleteClusterRoleBinding(this.devWorkspaceProxyClusterRoleBindingName)
            await this.kubeHelper.deleteClusterRoleBinding(this.webhookServerClusterRoleBindingName)

            await this.kubeHelper.deleteClusterRole(this.devWorkspaceEditWorkspaceClusterRoleName)
            await this.kubeHelper.deleteClusterRole(this.devWorkspaceViewWorkspaceClusterRoleName)
            await this.kubeHelper.deleteClusterRole(this.devWorkspaceProxyClusterRoleName)
            await this.kubeHelper.deleteClusterRole(this.devWorkspaceMetricsReaderClusterRoleName)
            await this.kubeHelper.deleteClusterRole(this.devWorkspaceClusterRoleName)
            await this.kubeHelper.deleteClusterRole(this.webhookServerClusterRoleName)

            await this.kubeHelper.deleteServiceAccount(this.devWorkspaceSAName, devWorkspaceNamespace)
            await this.kubeHelper.deleteServiceAccount(this.webhookServerSAName, devWorkspaceNamespace)
            task.title = `${task.title}...[Ok]`
          } catch (e: any) {
            task.title = `${task.title}...[Failed: ${e.message}]`
          }
        },
      },
      {
        title: 'Delete Certificates',
        enabled: (ctx: any) => !ctx[ChectlContext.IS_OPENSHIFT],
        task: async (_ctx: any, task: any) => {
          try {
            await this.kubeHelper.deleteIssuer(this.devWorkspaceIssuerName, devWorkspaceNamespace)
            await this.kubeHelper.deleteCertificate(this.devWorkspaceCertificateName, devWorkspaceNamespace)
            task.title = `${task.title}...[Ok]`
          } catch (e: any) {
            task.title = `${task.title}...[Failed: ${e.message}]`
          }
        },
      },
    ]
  }
}
