export interface ReleaseAsset {
  readonly name: string;
  readonly size: number;
  readonly downloadCount: number;
  readonly downloadUrl: string;
}

export interface Release {
  readonly id: string;
  readonly tagName: string;
  readonly name: string | null;
  readonly body: string | null;
  readonly url: string;
  readonly isDraft: boolean;
  readonly isPrerelease: boolean;
  readonly author: {
    readonly login: string;
    readonly avatarUrl: string | null;
  };
  readonly publishedAt: string | null;
  readonly createdAt: string;
  readonly assets: readonly ReleaseAsset[];
}
