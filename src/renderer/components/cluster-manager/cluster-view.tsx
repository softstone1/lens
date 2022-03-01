/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./cluster-view.scss";
import React from "react";
import { computed, IComputedValue, makeObservable, reaction } from "mobx";
import { disposeOnUnmount, observer } from "mobx-react";
import { ClusterStatus } from "./cluster-status";
import { ClusterFrameHandler } from "./lens-views";
import type { Cluster } from "../../../common/cluster/cluster";
import { ClusterStore } from "../../../common/cluster-store/cluster-store";
import { catalogEntityRegistry } from "../../api/catalog-entity-registry";
import type { ClusterViewRouteParams } from "../../../common/routes";
import { requestClusterActivation } from "../../ipc";
import { withInjectables } from "@ogre-tools/injectable-react";
import pathParametersInjectable from "../../routes/path-parameters.injectable";
import navigateToCatalogInjectable from "../+catalog/navigate-to-catalog.injectable";

interface Dependencies {
  pathParameters: IComputedValue<ClusterViewRouteParams>
  navigateToCatalog: () => void
}

@observer
class NonInjectedClusterView extends React.Component<Dependencies> {
  private store = ClusterStore.getInstance();

  constructor(props: Dependencies) {
    super(props);
    makeObservable(this);
  }

  @computed get clusterId() {
    return this.props.pathParameters.get().clusterId;
  }

  @computed get cluster(): Cluster | undefined {
    return this.store.getById(this.clusterId);
  }

  @computed get isReady(): boolean {
    const { cluster, clusterId } = this;

    return cluster?.ready && cluster?.available && ClusterFrameHandler.getInstance().hasLoadedView(clusterId);
  }

  componentDidMount() {
    this.bindEvents();
  }

  componentWillUnmount() {
    ClusterFrameHandler.getInstance().clearVisibleCluster();
    catalogEntityRegistry.activeEntity = null;
  }

  bindEvents() {
    disposeOnUnmount(this, [
      reaction(() => this.clusterId, async (clusterId) => {
        ClusterFrameHandler.getInstance().setVisibleCluster(clusterId);
        ClusterFrameHandler.getInstance().initView(clusterId);
        requestClusterActivation(clusterId, false); // activate and fetch cluster's state from main
        catalogEntityRegistry.activeEntity = clusterId;
      }, {
        fireImmediately: true,
      }),

      reaction(() => [this.cluster?.ready, this.cluster?.disconnected], ([, disconnected]) => {
        if (ClusterFrameHandler.getInstance().hasLoadedView(this.clusterId) && disconnected) {
          this.props.navigateToCatalog(); // redirect to catalog when active cluster get disconnected/not available
        }
      }),
    ]);
  }

  renderStatus(): React.ReactNode {
    const { cluster, isReady } = this;

    if (cluster && !isReady) {
      return <ClusterStatus cluster={cluster} className="box center"/>;
    }

    return null;
  }

  render() {
    return (
      <div className="ClusterView flex column align-center">
        {this.renderStatus()}
      </div>
    );
  }
}

export const ClusterView = withInjectables<Dependencies>(
  NonInjectedClusterView,

  {
    getProps: (di) => ({
      pathParameters: di.inject(pathParametersInjectable) as IComputedValue<ClusterViewRouteParams>,
      navigateToCatalog: di.inject(navigateToCatalogInjectable),
    }),
  },
);

