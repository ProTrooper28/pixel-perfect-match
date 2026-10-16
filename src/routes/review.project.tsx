import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  FileCheck,
  FileType,
  FileUp,
  FolderGit2,
  Info,
  Loader2,
  Upload,
  X,
  YourClipboardIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "@tanstack/react-router";
import {
  Field,
  FieldConstraint,
  FieldDescriptions,
  FieldHeader,
  FieldKind,
  FieldLayoutGroup,
  FieldLegend,
  FieldStep,
  FieldTitle,
} from "@/components/Form/Field";

import { uploadFile } from "@/services/upload.service";
import { useAuth } from "@/hooks/useAuth";
import { createProjectForUser } from "@/services/project.service";
import { createReportForUser } from "@/services/report.service";
import { ActivityLog } from "@/components/ActivityLog";
import { notify } from "@/lib/toast-messages";
import { LinkAccountDialog } from "@/components/linkaccountdialog";
import { TextButton } from "@/components/TextButton";
import { ProgressStepper } from "@/components/ProgressStepper";
import { ensureFeatureFlag, FEATURE_FLAGS_CTA } from "@/lib/feature-flags";
import { allowPasteOnConstraint, pasteTextFromClipboard } from "@/lib/paste-helpers";
import { suppressExternalOAuthFlow } from "@/lib/oauth-flow-helper";
import { withCreate } from "@/lib/save-helpers";
