export type IssueState = "open" | "closed";

export interface IssueLabel {
  readonly name: string;
  readonly color: string;
}

export interface IssueMilestone {
  readonly title: string;
  readonly state: "open" | "closed";
  readonly dueOn: string | null;
}

export interface IssueComment {
  readonly id: string;
  readonly body: string;
  readonly author: {
    readonly login: string;
    readonly avatarUrl: string | null;
  };
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface Issue {
  readonly id: string;
  readonly number: number;
  readonly title: string;
  readonly body: string | null;
  readonly state: IssueState;
  readonly url: string;
  readonly author: {
    readonly login: string;
    readonly avatarUrl: string | null;
  };
  readonly assignees: readonly {
    readonly login: string;
    readonly avatarUrl: string | null;
  }[];
  readonly labels: readonly IssueLabel[];
  readonly milestone: IssueMilestone | null;
  readonly comments: readonly IssueComment[] | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly closedAt: string | null;
}
