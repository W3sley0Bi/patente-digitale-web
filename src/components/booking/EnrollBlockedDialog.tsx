import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

/**
 * Informational modal shown when a student lands on an enrollment deep link
 * (?placeId=) but already has an active enrollment at a different school.
 * The DB only allows one active enrollment per student, so instead of letting
 * the enroll flow open and fail, we explain why enrolling isn't possible.
 * Dismissable, with a single close button.
 */
export function EnrollBlockedDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const { t } = useTranslation();

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{t("booking.enroll.blockedDialogTitle")}</DialogTitle>
					<DialogDescription>
						{t("booking.enroll.blockedDialogBody")}
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button onClick={() => onOpenChange(false)}>
						{t("booking.enroll.blockedDialogClose")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
