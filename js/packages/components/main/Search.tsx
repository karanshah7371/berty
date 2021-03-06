/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-native/no-inline-styles */
import { Messenger } from '@berty-tech/hooks'
import { useFirstConversationWithContact, useGetMessage } from '@berty-tech/hooks/Messenger'
import { Routes, useNavigation } from '@berty-tech/navigation'
import { messenger } from '@berty-tech/store'
import { useStyles } from '@berty-tech/styles'
import { useDimensions } from '@react-native-community/hooks'
import { CommonActions } from '@react-navigation/core'
import { noop, sortBy } from 'lodash'
import React, { useMemo, useState } from 'react'
import {
	Keyboard,
	ScrollView,
	SectionList,
	TextInput,
	TouchableHighlight,
	View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Icon, Layout, Text } from 'react-native-ui-kitten'
import { ConversationProceduralAvatar } from '../shared-components'

// Styles

const _titleIconSize = 30

const _landingIconSize = 90

const _resultAvatarSize = 45

const _fontSizeSearchComponent = 17 // trying to move away from in-house 'scale' (makes font too small in some devices)
const _fontSizeSmall = 12

const _searchComponentBorderRadius = 7
const _searchBarIconSize = 25

const _searchComponentMarginTopFactor = 0.02
const _approxFooterHeight = 90

const useStylesSearch = () => {
	const [{ text, background }] = useStyles()
	const { height: windowHeight, width: windowWidth } = useDimensions().window
	const isLandscape = () => windowHeight < windowWidth

	return {
		searchResultHighlightText: [
			{ fontSize: _fontSizeSmall },
			text.color.yellow,
			background.light.yellow,
			text.bold.medium,
		],
		plainMessageText: [{ fontSize: _fontSizeSmall }, text.color.grey],
		windowHeight,
		windowWidth,
		isLandscape,
	}
}

const SearchTitle: React.FC<{}> = () => {
	const [{ text, color }] = useStyles()
	const { dispatch } = useNavigation()
	return (
		<View
			style={[
				{
					flexDirection: 'row',
					justifyContent: 'center',
					alignItems: 'center',
					marginLeft: _titleIconSize,
				},
			]}
		>
			<Text
				style={[
					text.size.big,
					text.bold.medium,
					text.color.white,
					text.align.center,
					{
						flexShrink: 0,
						alignItems: 'center',
						justifyContent: 'center',
						flexGrow: 1,
					},
				]}
			>
				Search
			</Text>
			<Icon
				style={[
					{
						flexShrink: 0,
						flexGrow: 0,
					},
				]}
				name='arrow-forward-outline'
				width={_titleIconSize}
				height={_titleIconSize}
				fill={color.white}
				onPress={() => dispatch(CommonActions.navigate(Routes.Main.Home))}
			/>
		</View>
	)
}

const initialSearchText = ''

const SearchBar: React.FC<{
	onChange: (text: string) => void
	searchText: string
}> = ({ onChange, searchText }) => {
	const [{ row, color, background, text }] = useStyles()
	const onClear = (): void => {
		onChange('')
		Keyboard.dismiss()
	}

	return (
		<ScrollView contentContainerStyle={[row.left]} keyboardShouldPersistTaps='handled'>
			<Icon
				name='search'
				width={_searchBarIconSize}
				height={_searchBarIconSize}
				fill={color.yellow}
			/>
			<TextInput
				onChangeText={onChange}
				placeholder='Search'
				placeholderTextColor={color.yellow}
				style={[
					{ marginLeft: 15, padding: 4, flex: 2 },
					background.light.yellow,
					text.color.yellow,
				]}
				autoCorrect={false}
				autoCapitalize='none'
				value={searchText}
			/>
			{searchText.length > 0 && (
				<Icon
					name='close-circle-outline'
					width={_searchBarIconSize}
					height={_searchBarIconSize}
					fill={color.yellow}
					onPress={onClear}
					style={[{ marginLeft: 'auto' }]}
				/>
			)}
		</ScrollView>
	)
}

const SearchHint: React.FC<{ hintText: string }> = ({
	hintText = 'Search messages, contacts, or groups...',
}) => {
	const [{ row, color, text, margin, column }] = useStyles()
	const { windowWidth } = useStylesSearch()
	return (
		<View style={[column.top, { marginBottom: _approxFooterHeight }]}>
			<Icon
				name='search'
				width={_landingIconSize}
				height={_landingIconSize}
				fill={color.light.yellow}
				style={[row.item.justify, { opacity: 0.8 }]}
			/>
			<Text
				style={[
					text.align.center,
					margin.top.small,
					row.item.justify,
					text.color.light.yellow,
					text.size.medium,
					{ width: windowWidth * 0.5, fontSize: _fontSizeSearchComponent, opacity: 0.8 },
				]}
			>
				{hintText}
			</Text>
		</View>
	)
}

// SEARCH RESULTS

type SearchItemProps = {
	data: any
	searchTextKey: 'name' | 'message'
	searchText?: string
}

// TODO: Move/refactor to hooks
const useSearchItemDataFromContact = (
	data: any,
): {
	name: string
	message: string
	convId: string
	messageListIndex: number
} => {
	const { name = '', publicKey = '' } = data
	const conversation = useFirstConversationWithContact(publicKey)
	const lastMessage = useGetMessage(
		conversation ? conversation.messages[conversation?.messages.length - 1] : '',
	)

	return {
		name,
		messageListIndex: conversation ? conversation.messages.length - 1 : 0,
		convId: conversation ? conversation.id : '',
		message:
			lastMessage && lastMessage.type === messenger.AppMessageType.UserMessage
				? lastMessage.body
				: '',
	}
}

const useSearchItemDataFromMessage = (
	data: any = {},
): {
	name: string
	message: string
	convId: string
	messageListIndex: number
} => {
	// Here we no longer have to call useGetConversationFromMessage
	const {
		message: { body },
		conversationId,
		conversationTitle,
		messageIndex,
	} = data
	return {
		name: conversationTitle,
		message: body,
		messageListIndex: messageIndex,
		convId: conversationId,
	}
}

const MessageSearchResult: React.FC<{ message: string; searchText: string }> = ({
	message,
	searchText,
}) => {
	const [{ start, end }] = useState({
		start: message.toLowerCase().indexOf(searchText.toLowerCase()),
		end: message.toLowerCase().indexOf(searchText.toLowerCase()) + searchText.length,
	})
	const { plainMessageText, searchResultHighlightText } = useStylesSearch()

	return (
		<>
			<Text style={plainMessageText}>{message.slice(0, start)}</Text>
			<Text style={searchResultHighlightText}>{message.slice(start, end)}</Text>
			<Text style={plainMessageText}>{message.slice(end)}</Text>
		</>
	)
}

// hacky workaround to use conditional hook ^^
const useSomeSearchItem = (key: SearchItemProps['searchTextKey']) =>
	key === 'name' ? useSearchItemDataFromContact : useSearchItemDataFromMessage

const SearchResultItem: React.FC<SearchItemProps> = ({ data, searchTextKey, searchText = '' }) => {
	const [{ color, row, padding, flex, column, text, margin, border }] = useStyles()
	const { plainMessageText } = useStylesSearch()
	const { name, message, convId, messageListIndex } = useSomeSearchItem(searchTextKey)(data)
	const { dispatch } = useNavigation()

	const MessageDisplay = () =>
		searchTextKey === 'name' ? (
			<>{message}</>
		) : (
			<MessageSearchResult searchText={searchText} message={message} />
		)

	return (
		<TouchableHighlight
			disabled={!convId}
			underlayColor={!convId ? 'transparent' : color.light.grey}
			onPress={() =>
				!convId
					? noop()
					: dispatch(
							CommonActions.navigate({
								name: Routes.Chat.OneToOne,
								params: {
									convId,
									scrollToMessage: messageListIndex,
								},
							}),
					  )
			}
		>
			<View style={[row.center, padding.medium, border.bottom.tiny, border.color.light.grey]}>
				<ConversationProceduralAvatar
					conversationId={convId}
					size={_resultAvatarSize}
					diffSize={9}
					style={[padding.tiny, row.item.justify]}
				/>
				<View style={[flex.medium, column.justify, padding.left.medium]}>
					<View style={[{ flexDirection: 'row', alignItems: 'center' }]} />
					<View style={[margin.right.big]}>
						<Text numberOfLines={1} style={[text.bold.medium, !convId && text.color.grey]}>
							{name}
						</Text>
						<Text numberOfLines={1} style={plainMessageText}>
							<MessageDisplay />
						</Text>
					</View>
				</View>
			</View>
		</TouchableHighlight>
	)
}

const createSections = (contacts: any, messages: any, searchText: string) => {
	const sections = [
		{
			title: contacts.length ? 'Contacts' : '',
			data: [...contacts],
			renderItem: ({ item }: { item: any }) => (
				<SearchResultItem data={item} searchTextKey={'name'} />
			),
		},
		{
			title: messages.length ? 'Messages' : '',
			data: [...messages],

			renderItem: ({ item }: { item: any }) => (
				<SearchResultItem data={item} searchTextKey={'message'} searchText={searchText} />
			),
		},
	]
	return sections
}

const SearchComponent: React.FC<{}> = () => {
	const [searchText, setSearchText] = useState(initialSearchText)
	const contacts = Messenger.useAccountContactSearchResults(searchText)
	const messages = Messenger.useGetMessageSearchResultWithMetadata(searchText)

	const setValidSearchText = (textInput: string) => {
		// setSearchText(textInput)
		setSearchText(textInput.replace(/^\s+/g, ''))
	}

	const [{ padding, margin, background, text, flex }] = useStyles()
	const { windowHeight } = useStylesSearch()
	const sections = useMemo(() => createSections(contacts, messages, searchText), [
		messages,
		contacts,
		searchText,
	])

	const hintText = () =>
		searchText && !contacts.length ? 'No results found' : 'Search messages, contacts, or groups...'

	return (
		<View style={[flex.tiny]}>
			{/* Title */}
			<View
				style={[
					padding.small,
					margin.medium,
					margin.top.huge,
					{
						flexShrink: 0,
						marginTop: windowHeight * _searchComponentMarginTopFactor,
					},
				]}
			>
				<SearchTitle />
			</View>
			{/* SearchBar */}
			<View
				style={[
					padding.small,
					margin.horizontal.medium,
					margin.bottom.medium,
					{
						flexShrink: 0, // TODO: Add to API
						flexGrow: 0,
						borderRadius: _searchComponentBorderRadius,
					},
					background.light.yellow,
				]}
			>
				<SearchBar searchText={searchText} onChange={setValidSearchText} />
			</View>
			{/* Results or Landing */}
			<View
				style={[
					margin.top.small,
					{
						flexShrink: 1,
						flexGrow: 1,
						justifyContent: 'center',
					},
				]}
			>
				{contacts.length + messages.length > 0 ? (
					<SectionList
						bounces={false}
						style={[background.white]} // TODO: Needs to fill insets from SafeAreaView on Landscape
						keyExtractor={(item, index) => item.id + index}
						sections={sections}
						renderSectionHeader={({ section: { title } }) => {
							return title ? (
								<Text style={[text.size.large, padding.medium, background.white]}>{title}</Text>
							) : null
						}}
						ListFooterComponent={() => (
							// empty div at bottom of list

							// Workaround to make sure nothing is hidden behind footer;
							// adding padding/margin to this or a wrapping parent doesn't work
							<View style={[{ height: _approxFooterHeight }, background.white]} />
						)}
					/>
				) : (
					<SearchHint hintText={hintText()} />
				)}
			</View>
		</View>
	)
}

export const Search: React.FC<{}> = () => {
	const [{ flex, color }] = useStyles()

	return (
		<Layout style={[flex.tiny, { backgroundColor: color.yellow }]}>
			{/* // TODO: get no weird margins on orientation change */}
			<SafeAreaView style={[flex.tiny]} {...{ edges: ['right', 'top', 'left'] }}>
				<SearchComponent />
			</SafeAreaView>
		</Layout>
	)
}
